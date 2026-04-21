"""
app.py — Student Profile Analyzer Backend
Run locally : python app.py
Deploy      : gunicorn app:app
"""
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3, os

app = Flask(__name__)
CORS(app)

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "students.db")

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

# ── Serve Frontend ────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(".", filename)

# ── All students ──────────────────────────────────────────
@app.route("/api/students")
def get_students():
    dept   = request.args.get("dept", "")
    year   = request.args.get("year", "")
    grade  = request.args.get("grade", "")
    search = request.args.get("q", "")
    sql    = "SELECT * FROM students WHERE 1=1"
    params = []
    if dept:   sql += " AND department=?";   params.append(dept)
    if year:   sql += " AND year=?";         params.append(int(year))
    if grade:  sql += " AND grade=?";        params.append(grade)
    if search: sql += " AND name LIKE ?";    params.append(f"%{search}%")
    sql += " ORDER BY cgpa DESC"
    conn = get_db()
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ── Analytics ─────────────────────────────────────────────
@app.route("/api/analytics")
def get_analytics():
    conn = get_db()
    c    = conn.cursor()
    total    = c.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    avg_gpa  = c.execute("SELECT ROUND(AVG(gpa),2) FROM students").fetchone()[0]
    avg_cgpa = c.execute("SELECT ROUND(AVG(cgpa),2) FROM students").fetchone()[0]
    avg_att  = c.execute("SELECT ROUND(AVG(attendance),1) FROM students").fetchone()[0]
    avg_proj = c.execute("SELECT ROUND(AVG(projects),1) FROM students").fetchone()[0]
    grade_rows = c.execute("""
        SELECT grade, COUNT(*) as cnt FROM students GROUP BY grade ORDER BY
        CASE grade WHEN 'O' THEN 1 WHEN 'A+' THEN 2 WHEN 'A' THEN 3
                   WHEN 'B+' THEN 4 WHEN 'B' THEN 5 WHEN 'C' THEN 6 WHEN 'F' THEN 7 END
    """).fetchall()
    grade_dist = {r["grade"]: r["cnt"] for r in grade_rows}
    gpa_buckets = {}
    for label, cond in [
        ("< 2.0","gpa < 2.0"),("2.0-2.4","gpa >= 2.0 AND gpa < 2.4"),
        ("2.4-2.7","gpa >= 2.4 AND gpa < 2.7"),("2.7-3.0","gpa >= 2.7 AND gpa < 3.0"),
        ("3.0-3.3","gpa >= 3.0 AND gpa < 3.3"),("3.3-3.6","gpa >= 3.3 AND gpa < 3.6"),
        ("3.6-3.8","gpa >= 3.6 AND gpa < 3.8"),("3.8-4.0","gpa >= 3.8")]:
        gpa_buckets[label] = c.execute(f"SELECT COUNT(*) FROM students WHERE {cond}").fetchone()[0]
    dept_stats = [dict(r) for r in c.execute("""
        SELECT department, COUNT(*) as count, ROUND(AVG(gpa),2) as avg_gpa,
               ROUND(AVG(cgpa),2) as avg_cgpa, ROUND(AVG(attendance),1) as avg_att
        FROM students GROUP BY department ORDER BY count DESC""").fetchall()]
    year_stats = [dict(r) for r in c.execute("""
        SELECT year, ROUND(AVG(gpa),2) as avg_gpa, COUNT(*) as count
        FROM students GROUP BY year ORDER BY year""").fetchall()]
    gender_dist = {r["gender"]: r["count"] for r in c.execute(
        "SELECT gender, COUNT(*) as count FROM students GROUP BY gender").fetchall()}
    skill_counts = {}
    for row in c.execute("SELECT skills FROM students").fetchall():
        for sk in row["skills"].split(","):
            sk = sk.strip()
            if sk: skill_counts[sk] = skill_counts.get(sk, 0) + 1
    top_skills = [{"skill":s,"count":c2} for s,c2 in sorted(skill_counts.items(),key=lambda x:-x[1])[:12]]
    int_counts = {}
    for row in conn.execute("SELECT interests FROM students").fetchall():
        for it in row["interests"].split(","):
            it = it.strip()
            if it: int_counts[it] = int_counts.get(it, 0) + 1
    top_interests = [{"interest":i,"count":c2} for i,c2 in sorted(int_counts.items(),key=lambda x:-x[1])[:10]]
    att_gpa_data = [{"gpa":r["g"],"attendance":r["a"]} for r in c.execute("""
        SELECT ROUND(gpa,1) as g, ROUND(AVG(attendance),1) as a
        FROM students GROUP BY ROUND(gpa,1) ORDER BY g""").fetchall()]
    proj_by_grade = [dict(r) for r in c.execute("""
        SELECT grade, ROUND(AVG(projects),2) as avg_proj FROM students GROUP BY grade
        ORDER BY CASE grade WHEN 'O' THEN 1 WHEN 'A+' THEN 2 WHEN 'A' THEN 3
                            WHEN 'B+' THEN 4 WHEN 'B' THEN 5 WHEN 'C' THEN 6 WHEN 'F' THEN 7 END
    """).fetchall()]
    top10 = [dict(r) for r in c.execute("""
        SELECT name, department, gpa, cgpa, grade, projects, internships
        FROM students ORDER BY cgpa DESC LIMIT 10""").fetchall()]
    conn.close()
    return jsonify({
        "summary":{"total":total,"avg_gpa":float(avg_gpa),"avg_cgpa":float(avg_cgpa),
                   "avg_attendance":float(avg_att),"avg_projects":float(avg_proj)},
        "grade_dist":grade_dist,"gpa_buckets":gpa_buckets,"dept_stats":dept_stats,
        "year_stats":year_stats,"gender_dist":gender_dist,"top_skills":top_skills,
        "top_interests":top_interests,"att_gpa":att_gpa_data,"proj_by_grade":proj_by_grade,"top10":top10
    })

# ── Meta ──────────────────────────────────────────────────
@app.route("/api/meta")
def get_meta():
    conn = get_db()
    depts  = [r[0] for r in conn.execute("SELECT DISTINCT department FROM students ORDER BY department").fetchall()]
    grades = [r[0] for r in conn.execute("""
        SELECT DISTINCT grade FROM students ORDER BY
        CASE grade WHEN 'O' THEN 1 WHEN 'A+' THEN 2 WHEN 'A' THEN 3
                   WHEN 'B+' THEN 4 WHEN 'B' THEN 5 WHEN 'C' THEN 6 WHEN 'F' THEN 7 END
    """).fetchall()]
    conn.close()
    return jsonify({"departments":depts,"grades":grades,"years":[1,2,3,4]})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
