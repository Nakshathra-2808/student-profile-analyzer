"""
Student Profile Analyzer - Flask Backend
Run: python app.py
"""

from flask import Flask, jsonify
from flask_cors import CORS
import mysql.connector
import os

app = Flask(__name__)
CORS(app)  # Allow frontend to call the API

# ─── Database Configuration ───────────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", "2808"),
    "database": os.getenv("DB_NAME",     "student_analyzer"),
}

def get_db():
    """Return a fresh MySQL connection."""
    return mysql.connector.connect(**DB_CONFIG)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/api/students", methods=["GET"])
def get_students():
    """Return all student records as JSON."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name, gpa, skills, interests FROM students ORDER BY name")
    students = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(students)


@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    """Return aggregated analytics: average GPA and skill frequency."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # Average GPA (rounded to 2 dp)
    cursor.execute("SELECT ROUND(AVG(gpa), 2) AS avg_gpa FROM students")
    avg_gpa = cursor.fetchone()["avg_gpa"]

    # Total student count
    cursor.execute("SELECT COUNT(*) AS total FROM students")
    total = cursor.fetchone()["total"]

    # GPA distribution buckets
    cursor.execute("""
        SELECT
            SUM(gpa >= 3.7)                    AS a_range,
            SUM(gpa >= 3.3 AND gpa < 3.7)      AS b_plus_range,
            SUM(gpa >= 3.0 AND gpa < 3.3)      AS b_range,
            SUM(gpa >= 2.7 AND gpa < 3.0)      AS c_plus_range,
            SUM(gpa < 2.7)                      AS below_c
        FROM students
    """)
    gpa_dist = cursor.fetchone()

    # Skill frequency — split the comma-separated 'skills' column
    cursor.execute("SELECT skills FROM students")
    all_skills_raw = cursor.fetchall()

    skill_counts = {}
    for row in all_skills_raw:
        for skill in row["skills"].split(","):
            skill = skill.strip()
            if skill:
                skill_counts[skill] = skill_counts.get(skill, 0) + 1

    # Sort by frequency, keep top 10
    top_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # Interest frequency
    cursor.execute("SELECT interests FROM students")
    all_interests_raw = cursor.fetchall()
    interest_counts = {}
    for row in all_interests_raw:
        for interest in row["interests"].split(","):
            interest = interest.strip()
            if interest:
                interest_counts[interest] = interest_counts.get(interest, 0) + 1
    top_interests = sorted(interest_counts.items(), key=lambda x: x[1], reverse=True)[:8]

    cursor.close()
    conn.close()

    return jsonify({
        "total_students": total,
        "average_gpa":    float(avg_gpa),
        "gpa_distribution": {
            "A (≥3.7)":       int(gpa_dist["a_range"]),
            "B+ (3.3–3.7)":   int(gpa_dist["b_plus_range"]),
            "B (3.0–3.3)":    int(gpa_dist["b_range"]),
            "C+ (2.7–3.0)":   int(gpa_dist["c_plus_range"]),
            "Below C (<2.7)": int(gpa_dist["below_c"]),
        },
        "top_skills":    [{"skill": s, "count": c} for s, c in top_skills],
        "top_interests": [{"interest": i, "count": c} for i, c in top_interests],
    })


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
