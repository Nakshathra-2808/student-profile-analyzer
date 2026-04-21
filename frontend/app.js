const API_BASE = "http://127.0.0.1:5000/api";

let allStudents = [];

// Status message
function setStatus(text, type = "done") {
  const el = document.getElementById("status-msg");
  el.textContent = text;
  el.className = "status-msg show " + type;

  if (type !== "loading") {
    setTimeout(() => {
      el.classList.remove("show");
    }, 3000);
  }
}

// Load students
async function loadStudents() {
  setStatus("Loading students...", "loading");

  try {
    const res = await fetch(API_BASE + "/students");
    if (!res.ok) throw new Error("HTTP " + res.status);

    allStudents = await res.json();
    renderStudents(allStudents);

    document.getElementById("students-panel").classList.remove("hidden");
    setStatus("Loaded " + allStudents.length + " students", "done");

  } catch (err) {
    setStatus("Error: " + err.message, "error");
    console.error(err);
  }
}

// Render students
function renderStudents(students) {
  const tbody = document.getElementById("students-tbody");
  const countEl = document.getElementById("students-count");

  countEl.textContent = "Showing " + students.length + " students";

  if (students.length === 0) {
    tbody.innerHTML = "<tr><td colspan='5'>No students found</td></tr>";
    return;
  }

  let html = "";

  students.forEach(function(s) {
    const gpa = parseFloat(s.gpa) || 0;

    let gpaClass = "gpa-low";
    if (gpa >= 3.7) gpaClass = "gpa-high";
    else if (gpa >= 3.0) gpaClass = "gpa-mid";

    let skillsHTML = "";
    if (s.skills) {
      s.skills.split(",").forEach(function(sk) {
        skillsHTML += "<span class='skill-chip'>" + sk.trim() + "</span>";
      });
    }

    let interestsHTML = "";
    if (s.interests) {
      s.interests.split(",").forEach(function(it) {
        interestsHTML += "<span class='interest-chip'>" + it.trim() + "</span>";
      });
    }

    html +=
      "<tr>" +
        "<td>" + s.id + "</td>" +
        "<td>" + s.name + "</td>" +
        "<td><span class='" + gpaClass + "'>" + gpa.toFixed(2) + "</span></td>" +
        "<td>" + skillsHTML + "</td>" +
        "<td>" + interestsHTML + "</td>" +
      "</tr>";
  });

  tbody.innerHTML = html;
}

// Filter
function filterStudents() {
  const query = document.getElementById("search-input").value.toLowerCase();

  const filtered = allStudents.filter(function(s) {
    return (
      s.name.toLowerCase().includes(query) ||
      s.skills.toLowerCase().includes(query) ||
      s.interests.toLowerCase().includes(query)
    );
  });

  renderStudents(filtered);
}

// Load analytics
async function loadAnalytics() {
  setStatus("Running analytics...", "loading");

  try {
    const res = await fetch(API_BASE + "/analytics");
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();

    document.getElementById("val-total").textContent = data.total_students;
    document.getElementById("val-gpa").textContent =
      (parseFloat(data.average_gpa) || 0).toFixed(2);

    document.getElementById("analytics-panel").classList.remove("hidden");

    setStatus("Analytics ready", "done");

  } catch (err) {
    setStatus("Error: " + err.message, "error");
    console.error(err);
  }
}

