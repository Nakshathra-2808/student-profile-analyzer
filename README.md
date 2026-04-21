# Student Profile Analyzer

A beginner-friendly full-stack mini project.  
**Stack:** Python Flask · MySQL · Vanilla HTML/CSS/JS

---

## Folder Structure

```
student-profile-analyzer/
├── backend/
│   ├── app.py            ← Flask application & API routes
│   ├── schema.sql        ← MySQL schema + 100 seed records
│   └── requirements.txt  ← Python dependencies
└── frontend/
    ├── index.html        ← Dashboard UI
    ├── css/
    │   └── style.css     ← All styles (dark theme)
    └── js/
        └── app.js        ← API calls & DOM rendering
```

---

## Setup Guide

### Prerequisites
- Python 3.9+
- MySQL 8.x (running locally)
- A terminal / command prompt

---

### Step 1 — Create the Database

Open your MySQL client and run:

```bash
mysql -u root -p < backend/schema.sql
```

This creates the `student_analyzer` database, the `students` table, and inserts 100 records.

You can verify it worked:

```sql
USE student_analyzer;
SELECT COUNT(*) FROM students;   -- should return 100
```

---

### Step 2 — Configure the Database Password

Open `backend/app.py` and update the `DB_CONFIG` block:

```python
DB_CONFIG = {
    "host":     "localhost",
    "port":     3306,
    "user":     "root",
    "password": "YOUR_MYSQL_PASSWORD_HERE",   # ← change this
    "database": "student_analyzer",
}
```

Or export environment variables instead:

```bash
export DB_PASSWORD=yourpassword
```

---

### Step 3 — Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

### Step 4 — Start the Flask Server

```bash
python app.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
```

---

### Step 5 — Open the Frontend

Just open `frontend/index.html` in your browser — no build step needed.

```bash
# On macOS
open frontend/index.html

# On Linux
xdg-open frontend/index.html

# On Windows — double-click the file, or:
start frontend/index.html
```

---

## Using the Dashboard

| Button | What it does |
|--------|-------------|
| **Load Students** | Fetches all 100 students and renders them in a table |
| **Show Analytics** | Fetches aggregated stats and renders charts |
| **Filter box** | Live-filters the student table by name, skill, or interest |

---

## API Endpoints

| Method | URL | Returns |
|--------|-----|---------|
| GET | `/api/students` | Array of all student objects |
| GET | `/api/analytics` | Average GPA, GPA distribution, top skills & interests |

---

## Troubleshooting

**CORS error in browser console**  
Make sure Flask is running (`python app.py`) and `flask-cors` is installed.

**`Access denied` from MySQL**  
Double-check DB_CONFIG password in `app.py`.

**Port 5000 already in use**  
Change the last line of `app.py`:  
```python
app.run(debug=True, port=5001)
```
And update `API_BASE` in `frontend/js/app.js`:  
```js
const API_BASE = "http://localhost:5001/api";
```
