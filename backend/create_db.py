"""
create_db.py — Generates a rich, realistic student dataset.
Run: python create_db.py
"""
import sqlite3, random, math

random.seed(42)

conn = sqlite3.connect("students.db")
cur  = conn.cursor()
cur.execute("DROP TABLE IF EXISTS students")
cur.execute("""
CREATE TABLE students (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    age        INTEGER NOT NULL,
    gender     TEXT    NOT NULL,
    department TEXT    NOT NULL,
    year       INTEGER NOT NULL,
    gpa        REAL    NOT NULL,
    cgpa       REAL    NOT NULL,
    attendance REAL    NOT NULL,
    skills     TEXT    NOT NULL,
    interests  TEXT    NOT NULL,
    projects   INTEGER NOT NULL,
    internships INTEGER NOT NULL,
    grade      TEXT    NOT NULL
)
""")

# ── Name pools ────────────────────────────────────────────
FIRST = ["Aarav","Vivaan","Aditya","Rohan","Rahul","Arjun","Ishaan","Kabir",
         "Ananya","Diya","Sneha","Meera","Neha","Priya","Kavya","Anjali",
         "Vikram","Karan","Sahil","Manish","Gaurav","Deepak","Nikhil","Sonam",
         "Tanvi","Swati","Pooja","Riya","Divya","Lakshmi","Nisha","Ritika",
         "Varun","Pallavi","Suresh","Ashwin","Bhavna","Gautam","Deepika",
         "Vishal","Harsha","Preeti","Arun","Mithila","Pranav","Shweta",
         "Yamini","Lokesh","Chandani","Ramesh","Gayatri","Kiran","Sameer",
         "Lavanya","Avinash","Naveen","Padmini","Rajesh","Indrani","Chandra",
         "Murali","Rekha","Ajay","Lalita","Kamala","Raju","Sundar","Mani",
         "Vijaya","Pradeep","Bhargavi","Naresh","Sumitra","Sujatha","Kannan",
         "Hema","Vinod","Sarala","Tejas","Madhuri","Neeraj","Sunita","Rajeev"]
LAST  = ["Sharma","Reddy","Patel","Kumar","Singh","Das","Nair","Iyer",
         "Pillai","Menon","Krishnan","Rao","Gupta","Verma","Joshi","Bose",
         "Mishra","Tiwari","Kapoor","Saxena","Malhotra","Sinha","Agarwal",
         "Choudhary","Pandey","Rathi","Bhatia","Kulkarni","Desai","Naik",
         "Venkat","Subramanian","Subramaniam","Varma","Babu","Bhatt"]

DEPTS = {
    "Computer Science":      0.30,
    "Data Science":          0.18,
    "Electronics":           0.15,
    "Mechanical":            0.10,
    "Civil":                 0.08,
    "Business Analytics":    0.10,
    "Artificial Intelligence":0.09,
}

SKILLS_BY_DEPT = {
    "Computer Science":       ["Python","Java","C++","JavaScript","React","Node.js","SQL","Docker","Git","Linux","TypeScript","Go"],
    "Data Science":           ["Python","R","SQL","Pandas","NumPy","Scikit-learn","TensorFlow","Tableau","Power BI","Spark","Hadoop","Matplotlib"],
    "Electronics":            ["C","VHDL","MATLAB","Arduino","PCB Design","Embedded C","ARM","Signal Processing","FPGA","LabVIEW"],
    "Mechanical":             ["AutoCAD","SolidWorks","ANSYS","MATLAB","Thermodynamics","CNC","3D Printing","Fluid Dynamics"],
    "Civil":                  ["AutoCAD","STAAD Pro","MATLAB","Revit","GIS","Surveying","Primavera","MS Project"],
    "Business Analytics":     ["Excel","SQL","Python","Tableau","Power BI","R","SPSS","Salesforce","Google Analytics","SAP"],
    "Artificial Intelligence":["Python","TensorFlow","PyTorch","NLP","Computer Vision","Reinforcement Learning","MLOps","Keras","OpenCV","Hugging Face"],
}

INTERESTS_BY_DEPT = {
    "Computer Science":        ["Web Dev","Open Source","Gaming","DevOps","Cybersecurity","Mobile Apps","Cloud","Startups"],
    "Data Science":            ["Data Analytics","Finance","Healthcare","Research","Kaggle","Statistics","Visualization","Business Intelligence"],
    "Electronics":             ["IoT","Robotics","VLSI","Embedded Systems","Drones","Smart Devices","Power Electronics"],
    "Mechanical":              ["Automotive","Aerospace","Manufacturing","Renewable Energy","Robotics","Supply Chain"],
    "Civil":                   ["Infrastructure","Smart Cities","Environmental","Construction Tech","Urban Planning","Water Resources"],
    "Business Analytics":      ["Fintech","E-commerce","Market Research","Product Management","Consulting","Strategy"],
    "Artificial Intelligence": ["AI Research","Autonomous Vehicles","NLP","Ethics in AI","Computer Vision","Robotics","AI Products"],
}

def dept_weighted():
    depts = list(DEPTS.keys())
    weights = list(DEPTS.values())
    return random.choices(depts, weights=weights, k=1)[0]

def gpa_for_tier(tier):
    """tier: 'fail'|'poor'|'average'|'good'|'excellent'"""
    if tier == "fail":       return round(random.uniform(1.20, 1.99), 2)
    if tier == "poor":       return round(random.uniform(2.00, 2.69), 2)
    if tier == "average":    return round(random.uniform(2.70, 3.19), 2)
    if tier == "good":       return round(random.uniform(3.20, 3.59), 2)
    if tier == "excellent":  return round(random.uniform(3.60, 4.00), 2)

def cgpa_from_gpa(gpa):
    # CGPA ≈ GPA with small random drift ± 0.15
    raw = gpa + random.uniform(-0.15, 0.15)
    return round(max(1.0, min(4.0, raw)), 2)

def attendance_for_gpa(gpa):
    # Weak positive correlation: higher GPA → generally higher attendance
    base = 55 + (gpa / 4.0) * 35          # range 55–90 base
    noise = random.gauss(0, 6)
    return round(min(100, max(35, base + noise)), 1)

def grade_from_gpa(gpa):
    if gpa >= 3.70: return "O"     # Outstanding
    if gpa >= 3.30: return "A+"
    if gpa >= 3.00: return "A"
    if gpa >= 2.70: return "B+"
    if gpa >= 2.40: return "B"
    if gpa >= 2.00: return "C"
    return "F"

def projects_for_tier(tier):
    if tier in ("fail","poor"):   return random.randint(0, 2)
    if tier == "average":         return random.randint(1, 3)
    if tier == "good":            return random.randint(2, 5)
    return random.randint(3, 8)

def internships_for_tier(tier):
    if tier in ("fail","poor"):   return random.randint(0, 0)
    if tier == "average":         return random.randint(0, 1)
    if tier == "good":            return random.randint(0, 2)
    return random.randint(1, 3)

# ── Tier distribution ─────────────────────────────────────
TIERS = ["fail","poor","average","good","excellent"]
WEIGHTS = [0.06, 0.12, 0.28, 0.32, 0.22]   # realistic bell curve skewed right

names_used = set()
records = []

for _ in range(200):
    # Unique name
    for _ in range(50):
        name = random.choice(FIRST) + " " + random.choice(LAST)
        if name not in names_used:
            names_used.add(name)
            break

    tier   = random.choices(TIERS, weights=WEIGHTS, k=1)[0]
    dept   = dept_weighted()
    gpa    = gpa_for_tier(tier)
    cgpa   = cgpa_from_gpa(gpa)
    att    = attendance_for_gpa(gpa)
    grade  = grade_from_gpa(gpa)
    year   = random.randint(1, 4)
    age    = 17 + year + random.randint(0, 2)
    gender = random.choice(["Male","Male","Female","Female","Other"])

    sk_pool = SKILLS_BY_DEPT[dept]
    in_pool = INTERESTS_BY_DEPT[dept]
    n_skills = 3 if tier in ("fail","poor") else (4 if tier == "average" else random.randint(4, 6))
    skills    = ", ".join(random.sample(sk_pool, min(n_skills, len(sk_pool))))
    interests = ", ".join(random.sample(in_pool, random.randint(1, 3)))
    projects   = projects_for_tier(tier)
    internships = internships_for_tier(tier)

    records.append((name, age, gender, dept, year, gpa, cgpa, att, skills, interests, projects, internships, grade))

cur.executemany("""
INSERT INTO students (name,age,gender,department,year,gpa,cgpa,attendance,skills,interests,projects,internships,grade)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
""", records)

conn.commit()
conn.close()
print(f"✓ Created students.db with {len(records)} students")
print("Grade distribution:")
from collections import Counter
gc = Counter(r[12] for r in records)
for g in ["O","A+","A","B+","B","C","F"]:
    print(f"  {g}: {gc.get(g,0)}")
