"""
Student Profile Analyzer Backend
Run locally : python app.py
Deploy      : gunicorn app:app
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Database path
DB_PATH = os.path.join(BASE_DIR, "students.db")

# Frontend path (IMPORTANT FIX)
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

# Fallback (for Render issues)
if not os.path.exists(FRONTEND_DIR):
    FRONTEND_DIR = BASE_DIR


# ─────────────────────────────────────────────
# Database Connection
# ─────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ─────────────────────────────────────────────
# Serve Frontend
# ─────────────────────────────────────────────
@app.route("/")
def index():
    try:
        return send_from_directory(FRONTEND_DIR, "index.html")
    except Exception as e:
        return f"Frontend not found: {str(e)}", 500


@app.route("/<path:filename>")
def static_files(filename):
    try:
        return send_from_directory(FRONTEND_DIR, filename)
    except:
        return "File not found", 404


# ─────────────────────────────────────────────
# Students API
# ─────────────────────────────────────────────
@app.route("/api/students")
def get_students():
    dept   = request.args.get("dept", "")
    year   = request.args.get("year", "")
    grade  = request.args.get("grade", "")
    search = request.args.get("q", "")

    query = "SELECT * FROM students WHERE 1=1"
    params = []

    if dept:
        query += " AND department=?"
        params.append(dept)

    if year:
        query += " AND year=?"
        params.append(int(year))

    if grade:
        query += " AND grade=?"
        params.append(grade)

    if search:
        query += " AND name LIKE ?"
        params.append(f"%{search}%")

    query += " ORDER BY cgpa DESC"

    conn = get_db()
    rows = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows])


# ─────────────────────────────────────────────
# Analytics API
# ─────────────────────────────────────────────
@app.route("/api/analytics")
def get_analytics():
    conn = get_db()
    cursor = conn.cursor()

    total = cursor.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    avg_gpa = cursor.execute("SELECT ROUND(AVG(gpa),2) FROM students").fetchone()[0]
    avg_cgpa = cursor.execute("SELECT ROUND(AVG(cgpa),2) FROM students").fetchone()[0]
    avg_attendance = cursor.execute("SELECT ROUND(AVG(attendance),1) FROM students").fetchone()[0]
    avg_projects = cursor.execute("SELECT ROUND(AVG(projects),1) FROM students").fetchone()[0]

    grade_data = cursor.execute("""
        SELECT grade, COUNT(*) as count
        FROM students
        GROUP BY grade
    """).fetchall()

    grade_dist = {row["grade"]: row["count"] for row in grade_data}

    conn.close()

    return jsonify({
        "summary": {
            "total": total,
            "avg_gpa": float(avg_gpa),
            "avg_cgpa": float(avg_cgpa),
            "avg_attendance": float(avg_attendance),
            "avg_projects": float(avg_projects)
        },
        "grade_dist": grade_dist
    })


# ─────────────────────────────────────────────
# Meta API
# ─────────────────────────────────────────────
@app.route("/api/meta")
def get_meta():
    conn = get_db()

    departments = [row[0] for row in conn.execute(
        "SELECT DISTINCT department FROM students ORDER BY department"
    ).fetchall()]

    grades = [row[0] for row in conn.execute(
        "SELECT DISTINCT grade FROM students"
    ).fetchall()]

    conn.close()

    return jsonify({
        "departments": departments,
        "grades": grades,
        "years": [1, 2, 3, 4]
    })


# ─────────────────────────────────────────────
# Run App
# ─────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)