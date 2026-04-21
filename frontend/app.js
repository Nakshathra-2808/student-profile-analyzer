/* ============================================================
   Student Profile Analyzer — Frontend Logic
   Talks to Flask at http://127.0.0.1:5000
   ============================================================ */

const API = "/api";

// Chart instances (stored so we can destroy before redrawing)
const CHARTS = {};

// Students cache
let allStudents   = [];
let filteredStudents = [];
let sortKey       = "cgpa";
let sortDir       = "desc";
let currentPage   = 1;
const PAGE_SIZE   = 20;

// Chart.js global defaults — match our dark theme
Chart.defaults.color          = "#8b96b0";
Chart.defaults.borderColor    = "#252d3f";
Chart.defaults.font.family    = "'JetBrains Mono', monospace";
Chart.defaults.font.size      = 11;
Chart.defaults.plugins.legend.labels.boxWidth  = 10;
Chart.defaults.plugins.legend.labels.padding   = 14;
Chart.defaults.plugins.tooltip.backgroundColor = "#1d2333";
Chart.defaults.plugins.tooltip.borderColor     = "#2e3850";
Chart.defaults.plugins.tooltip.borderWidth     = 1;
Chart.defaults.plugins.tooltip.padding         = 10;
Chart.defaults.plugins.tooltip.titleFont       = { family: "'Syne'", size: 13, weight: "700" };
Chart.defaults.plugins.tooltip.bodyFont        = { family: "'JetBrains Mono'", size: 11 };

/* ─── PALETTE ──────────────────────────────────────────── */
const P = {
  teal:   "#00d4aa",
  amber:  "#f5a623",
  purple: "#7c6af7",
  blue:   "#4a9eff",
  coral:  "#f06060",
  green:  "#52c97a",
  pink:   "#e879a0",
  cyan:   "#38bdf8",
};

const PALETTE = Object.values(P);

/* ─── INIT ─────────────────────────────────────────────── */
window.addEventListener("DOMContentLoaded", () => {
  loadAll();
  loadStudents();
  populateMeta();
});

async function loadAll() {
  try {
    const res  = await fetch(`${API}/analytics`);
    const data = await res.json();
    renderKPIs(data.summary);
    renderGradeChart(data.grade_dist);
    renderGpaChart(data.gpa_buckets);
    renderDeptChart(data.dept_stats);
    renderGenderChart(data.gender_dist);
    renderSkillBars(data.top_skills);
    renderAttGpaChart(data.att_gpa);
    renderLeaderboard(data.top10);
    renderYearChart(data.year_stats);
    renderProjGradeChart(data.proj_by_grade);
    renderInterestCloud(data.top_interests);
    renderDeptBubble(data.dept_stats);
    setStatus("ok", `${data.summary.total} students loaded`);
  } catch(e) {
    setStatus("err", "Cannot reach Flask server");
    console.error(e);
  }
}

async function loadStudents() {
  const res = await fetch(`${API}/students`);
  allStudents = await res.json();
  filteredStudents = [...allStudents];
  renderTable();
}

async function populateMeta() {
  try {
    const res  = await fetch(`${API}/meta`);
    const meta = await res.json();
    const dSel = document.getElementById("s-dept");
    meta.departments.forEach(d => {
      const o = document.createElement("option");
      o.value = d; o.textContent = d;
      dSel.appendChild(o);
    });
    const gSel = document.getElementById("s-grade");
    meta.grades.forEach(g => {
      const o = document.createElement("option");
      o.value = g; o.textContent = g;
      gSel.appendChild(o);
    });
  } catch(e) {}
}

function refreshAll() {
  const btn = document.querySelector(".btn-refresh svg");
  btn.style.animation = "spin .6s linear";
  setTimeout(() => btn.style.animation = "", 700);
  loadAll();
  loadStudents();
}

/* ─── TAB SWITCHING ────────────────────────────────────── */
function switchTab(id, el) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(`tab-${id}`).classList.add("active");
  el.classList.add("active");
  const titles = { analytics:"Dashboard", students:"Students", performance:"Performance" };
  const subs   = { analytics:"Analytics Overview", students:"Browse & Filter Records", performance:"Detailed Performance Analysis" };
  document.getElementById("page-title").textContent = titles[id];
  document.getElementById("page-sub").textContent   = subs[id];
}

/* ─── STATUS ───────────────────────────────────────────── */
function setStatus(type, msg) {
  const el  = document.getElementById("db-status");
  const dot = el.querySelector(".dot");
  dot.className = `dot dot-${type}`;
  el.querySelector("span:last-child").textContent = msg;
}

/* ─── KPIs ─────────────────────────────────────────────── */
function renderKPIs(s) {
  animateCount("k-total", s.total, 0);
  animateCount("k-gpa",   s.avg_gpa, 2);
  animateCount("k-cgpa",  s.avg_cgpa, 2);
  animateCount("k-att",   s.avg_attendance, 1, "%");
  animateCount("k-proj",  s.avg_projects, 1);
}

function animateCount(id, target, decimals, suffix="") {
  const el    = document.getElementById(id);
  const start = performance.now();
  const dur   = 900;
  function frame(now) {
    const t   = Math.min((now - start) / dur, 1);
    const val = target * easeOut(t);
    el.textContent = val.toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

/* ─── GRADE CHART ──────────────────────────────────────── */
function renderGradeChart(dist) {
  const colors = { O:P.teal, "A+":P.green, A:P.blue, "B+":P.purple, B:P.amber, C:P.coral, F:P.pink };
  destroy("gradeChart");
  CHARTS.grade = new Chart(document.getElementById("gradeChart"), {
    type: "bar",
    data: {
      labels: Object.keys(dist),
      datasets: [{
        data: Object.values(dist),
        backgroundColor: Object.keys(dist).map(g => colors[g] || P.cyan),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8b96b0" } },
        y: { grid: { color: "#252d3f" }, ticks: { color: "#8b96b0" } }
      },
      animation: { duration: 1000 }
    }
  });
}

/* ─── GPA HISTOGRAM ────────────────────────────────────── */
function renderGpaChart(buckets) {
  destroy("gpaChart");
  CHARTS.gpa = new Chart(document.getElementById("gpaChart"), {
    type: "bar",
    data: {
      labels: Object.keys(buckets),
      datasets: [{
        data: Object.values(buckets),
        backgroundColor: "rgba(0,212,170,.25)",
        borderColor: P.teal,
        borderWidth: 1.5,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8b96b0", maxRotation: 30 } },
        y: { grid: { color: "#252d3f" }, ticks: { color: "#8b96b0" } }
      },
      animation: { duration: 1000 }
    }
  });
}

/* ─── DEPT CHART ───────────────────────────────────────── */
function renderDeptChart(depts) {
  destroy("deptChart");
  CHARTS.dept = new Chart(document.getElementById("deptChart"), {
    type: "bar",
    data: {
      labels: depts.map(d => d.department.replace(" ", "\n")),
      datasets: [
        {
          label: "Students",
          data: depts.map(d => d.count),
          backgroundColor: "rgba(124,106,247,.3)",
          borderColor: P.purple,
          borderWidth: 1.5,
          borderRadius: 4,
          yAxisID: "y",
        },
        {
          label: "Avg GPA",
          data: depts.map(d => d.avg_gpa),
          type: "line",
          borderColor: P.amber,
          backgroundColor: "transparent",
          pointBackgroundColor: P.amber,
          pointRadius: 5,
          tension: .35,
          yAxisID: "y2",
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8b96b0" } },
        y:  { position: "left",  grid: { color: "#252d3f" }, ticks: { color: "#8b96b0" }, title: { display: true, text: "Students", color: "#515d7a" } },
        y2: { position: "right", grid: { display: false }, min: 2.5, max: 4.0, ticks: { color: "#8b96b0" }, title: { display: true, text: "Avg GPA", color: "#515d7a" } }
      },
      animation: { duration: 1000 }
    }
  });
}

/* ─── GENDER CHART ─────────────────────────────────────── */
function renderGenderChart(dist) {
  destroy("genderChart");
  CHARTS.gender = new Chart(document.getElementById("genderChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(dist),
      datasets: [{
        data: Object.values(dist),
        backgroundColor: [P.teal, P.purple, P.amber],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} students` } }
      },
      animation: { animateRotate: true, duration: 1000 }
    }
  });
}

/* ─── SKILL BARS ───────────────────────────────────────── */
function renderSkillBars(skills) {
  const container = document.getElementById("skills-bars");
  const max = skills[0]?.count || 1;
  container.innerHTML = skills.map(({ skill, count }) => `
    <div class="sbar-row">
      <span class="sbar-name">${esc(skill)}</span>
      <div class="sbar-track"><div class="sbar-fill" data-w="${(count/max*100).toFixed(1)}"></div></div>
      <span class="sbar-count">${count}</span>
    </div>
  `).join("");
  requestAnimationFrame(() => {
    container.querySelectorAll(".sbar-fill").forEach(el => el.style.width = el.dataset.w + "%");
  });
}

/* ─── ATT vs GPA CHART ─────────────────────────────────── */
function renderAttGpaChart(data) {
  destroy("attGpaChart");
  CHARTS.attGpa = new Chart(document.getElementById("attGpaChart"), {
    type: "line",
    data: {
      labels: data.map(d => d.gpa),
      datasets: [{
        label: "Avg Attendance",
        data: data.map(d => d.attendance),
        borderColor: P.cyan,
        backgroundColor: "rgba(56,189,248,.1)",
        pointBackgroundColor: P.cyan,
        pointRadius: 4,
        tension: .4,
        fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "#252d3f" }, title: { display: true, text: "GPA", color: "#515d7a" }, ticks: { color: "#8b96b0" } },
        y: { grid: { color: "#252d3f" }, title: { display: true, text: "Attendance %", color: "#515d7a" }, min: 40, max: 100, ticks: { color: "#8b96b0" } }
      },
      animation: { duration: 1000 }
    }
  });
}

/* ─── LEADERBOARD ──────────────────────────────────────── */
function renderLeaderboard(students) {
  const ranks = { 1:"gold", 2:"silver", 3:"bronze" };
  document.getElementById("leaderboard").innerHTML = students.map((s, i) => `
    <div class="lb-row" onclick="openStudentModal(${JSON.stringify(s).replace(/"/g,'&quot;')})">
      <span class="lb-rank ${ranks[i+1]||''}">${i+1}</span>
      <div><div class="lb-name">${esc(s.name)}</div><div class="lb-dept">${esc(s.department)}</div></div>
      <span></span>
      <span class="lb-gpa mono">${s.gpa.toFixed(2)}</span>
      <span class="lb-cgpa mono">${s.cgpa.toFixed(2)}</span>
      <span>${gradeBadge(s.grade)}</span>
      <span class="mono" style="font-size:11px;color:var(--text2)">${s.projects} proj</span>
    </div>
  `).join("");
}

/* ─── YEAR CHART ───────────────────────────────────────── */
function renderYearChart(years) {
  destroy("yearChart");
  CHARTS.year = new Chart(document.getElementById("yearChart"), {
    type: "bar",
    data: {
      labels: years.map(y => `Year ${y.year}`),
      datasets: [
        {
          label: "Avg GPA",
          data: years.map(y => y.avg_gpa),
          backgroundColor: [P.teal, P.blue, P.purple, P.amber],
          borderRadius: 8,
          borderSkipped: false,
        },
        {
          label: "Count",
          data: years.map(y => y.count),
          type: "line",
          borderColor: P.coral,
          backgroundColor: "transparent",
          pointBackgroundColor: P.coral,
          pointRadius: 5,
          tension: .3,
          yAxisID: "y2",
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8b96b0" } },
        y:  { min: 2.5, max: 4.0, grid: { color: "#252d3f" }, ticks: { color: "#8b96b0" }, title: { display: true, text: "Avg GPA", color: "#515d7a" } },
        y2: { position: "right", grid: { display: false }, ticks: { color: "#8b96b0" }, title: { display: true, text: "Students", color: "#515d7a" } }
      },
      animation: { duration: 1000 }
    }
  });
}

/* ─── PROJECTS BY GRADE ────────────────────────────────── */
function renderProjGradeChart(data) {
  destroy("projGradeChart");
  CHARTS.projGrade = new Chart(document.getElementById("projGradeChart"), {
    type: "bar",
    data: {
      labels: data.map(d => d.grade),
      datasets: [{
        label: "Avg Projects",
        data: data.map(d => d.avg_proj),
        backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "#252d3f" }, ticks: { color: "#8b96b0" } },
        y: { grid: { display: false }, ticks: { color: "#8b96b0" } }
      },
      animation: { duration: 1000 }
    }
  });
}

/* ─── INTEREST CLOUD ───────────────────────────────────── */
function renderInterestCloud(interests) {
  document.getElementById("interest-tags").innerHTML = interests.map(({ interest, count }) =>
    `<span class="int-tag">${esc(interest)}<span class="int-badge">${count}</span></span>`
  ).join("");
}

/* ─── DEPT BUBBLE ──────────────────────────────────────── */
function renderDeptBubble(depts) {
  destroy("deptBubbleChart");
  CHARTS.deptBubble = new Chart(document.getElementById("deptBubbleChart"), {
    type: "bubble",
    data: {
      datasets: depts.map((d, i) => ({
        label: d.department,
        data: [{ x: d.avg_gpa, y: d.avg_att, r: Math.sqrt(d.count) * 3 }],
        backgroundColor: PALETTE[i % PALETTE.length] + "55",
        borderColor:     PALETTE[i % PALETTE.length],
        borderWidth: 1.5,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: {
          label: ctx => ` ${ctx.dataset.label}: GPA ${ctx.raw.x}, Att ${ctx.raw.y}%`
        }}
      },
      scales: {
        x: { grid: { color: "#252d3f" }, min: 2.8, max: 3.6, title: { display: true, text: "Avg GPA", color: "#515d7a" }, ticks: { color: "#8b96b0" } },
        y: { grid: { color: "#252d3f" }, min: 70, max: 95, title: { display: true, text: "Avg Attendance %", color: "#515d7a" }, ticks: { color: "#8b96b0" } }
      },
      animation: { duration: 1000 }
    }
  });
}

/* ─── STUDENTS TABLE ───────────────────────────────────── */
let debTimer;
function debounceFilter() {
  clearTimeout(debTimer);
  debTimer = setTimeout(applyFilter, 220);
}

function applyFilter() {
  const q     = document.getElementById("s-search").value.toLowerCase();
  const dept  = document.getElementById("s-dept").value;
  const year  = document.getElementById("s-year").value;
  const grade = document.getElementById("s-grade").value;

  filteredStudents = allStudents.filter(s => {
    if (q     && !s.name.toLowerCase().includes(q)) return false;
    if (dept  && s.department !== dept)              return false;
    if (year  && s.year != year)                     return false;
    if (grade && s.grade !== grade)                  return false;
    return true;
  });
  currentPage = 1;
  renderTable();
}

function sortBy(key) {
  if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
  else { sortKey = key; sortDir = key === "name" ? "asc" : "desc"; }
  document.querySelectorAll(".data-table th").forEach(th => th.classList.remove("sort-asc","sort-desc"));
  const idx = ["id","name","department","year","gpa","cgpa","attendance","grade","projects","internships"].indexOf(key);
  const ths = document.querySelectorAll(".data-table th");
  if (ths[idx]) ths[idx].classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
  renderTable();
}

function renderTable() {
  const sorted = [...filteredStudents].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
    return sortDir === "asc" ? String(va).localeCompare(vb) : String(vb).localeCompare(va);
  });

  const total = sorted.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const slice = sorted.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);

  document.getElementById("filter-count").textContent = `${total} student${total!==1?"s":""}`;

  document.getElementById("table-body").innerHTML = slice.map(s => {
    const gClass = s.cgpa >= 3.6 ? "gpa-hi" : s.cgpa >= 2.7 ? "gpa-md" : "gpa-lo";
    const aColor = s.attendance >= 75 ? "#00d4aa" : s.attendance >= 60 ? "#f5a623" : "#f05252";
    const chips  = s.skills.split(",").map(sk => `<span class="skill-chip">${esc(sk.trim())}</span>`).join("");
    return `
      <tr onclick='openStudentModal(${JSON.stringify(s).replace(/'/g,"&#39;")})'>
        <td class="mono" style="color:var(--text3)">${s.id}</td>
        <td style="font-weight:600">${esc(s.name)}</td>
        <td style="color:var(--text2);font-size:12px">${esc(s.department)}</td>
        <td class="mono" style="text-align:center">${s.year}</td>
        <td class="mono ${gClass}">${s.gpa.toFixed(2)}</td>
        <td class="mono ${gClass}">${s.cgpa.toFixed(2)}</td>
        <td>
          <div class="att-bar">
            <div class="att-track"><div class="att-fill" style="width:${s.attendance}%;background:${aColor}"></div></div>
            <span class="att-val">${s.attendance}%</span>
          </div>
        </td>
        <td>${gradeBadge(s.grade)}</td>
        <td class="mono" style="text-align:center">${s.projects}</td>
        <td class="mono" style="text-align:center">${s.internships}</td>
        <td>${chips}</td>
      </tr>
    `;
  }).join("");

  // Pagination
  const pg = document.getElementById("pagination");
  if (pages <= 1) { pg.innerHTML = ""; return; }
  let html = `<button class="pg-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?"disabled":""}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - currentPage) <= 1) {
      html += `<button class="pg-btn ${i===currentPage?"active":""}" onclick="goPage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 2) {
      html += `<span style="color:var(--text3);padding:0 2px">…</span>`;
    }
  }
  html += `<button class="pg-btn" onclick="goPage(${currentPage+1})" ${currentPage===pages?"disabled":""}>›</button>`;
  pg.innerHTML = html;
}

function goPage(p) {
  const pages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  currentPage = Math.max(1, Math.min(p, pages));
  renderTable();
}

/* ─── MODAL ────────────────────────────────────────────── */
function openStudentModal(s) {
  if (typeof s === "string") s = JSON.parse(s);
  const gClass = s.cgpa >= 3.6 ? "gpa-hi" : s.cgpa >= 2.7 ? "gpa-md" : "gpa-lo";
  const skills = s.skills.split(",").map(sk => `<span class="skill-chip">${esc(sk.trim())}</span>`).join(" ");
  const interests = s.interests ? s.interests.split(",").map(i => `<span class="int-tag" style="padding:4px 10px;font-size:11px">${esc(i.trim())}</span>`).join("") : "—";

  document.getElementById("modal-body").innerHTML = `
    <div class="modal-name">${esc(s.name)}</div>
    <div class="modal-dept">${esc(s.department)} · Year ${s.year}</div>
    <div class="modal-stats">
      <div class="mstat"><span class="mstat-label">GPA</span><span class="mstat-value ${gClass}">${(+s.gpa).toFixed(2)}</span></div>
      <div class="mstat"><span class="mstat-label">CGPA</span><span class="mstat-value ${gClass}">${(+s.cgpa).toFixed(2)}</span></div>
      <div class="mstat"><span class="mstat-label">Grade</span><span class="mstat-value">${gradeBadge(s.grade)}</span></div>
      <div class="mstat"><span class="mstat-label">Attendance</span><span class="mstat-value">${s.attendance}%</span></div>
      <div class="mstat"><span class="mstat-label">Projects</span><span class="mstat-value">${s.projects}</span></div>
      <div class="mstat"><span class="mstat-label">Internships</span><span class="mstat-value">${s.internships}</span></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Skills</div>
      <div>${skills}</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Interests</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${interests}</div>
    </div>
  `;
  document.getElementById("modal-overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}

document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

/* ─── HELPERS ──────────────────────────────────────────── */
function destroy(id) { if (CHARTS[id]) { CHARTS[id].destroy(); delete CHARTS[id]; } }

function gradeBadge(g) {
  const map = { O:"grade-O", "A+":"grade-Ap", A:"grade-A", "B+":"grade-Bp", B:"grade-B", C:"grade-C", F:"grade-F" };
  return `<span class="grade-badge ${map[g]||''}">${g}</span>`;
}

function esc(s) {
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
