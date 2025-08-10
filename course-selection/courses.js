// course-selection/courses.js
// Select up to two courses and submit for admin approval

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAXk05rcENJrLJWY8CZ5evgI7ZdmhUxdNY",
  authDomain: "universitysystem-aaf1c.firebaseapp.com",
  projectId: "universitysystem-aaf1c",
  storageBucket: "universitysystem-aaf1c.firebasestorage.app",
  messagingSenderId: "818148764428",
  appId: "1:818148764428:web:4f70a379349a5706607729",
  measurementId: "G-2XPE6BZNV8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const logoutBtn = document.getElementById('logoutBtn');
const grid = document.getElementById('courseGrid');
const submitBtn = document.getElementById('submitBtn');
const info = document.getElementById('info');
const errorEl = document.getElementById('error');
const successEl = document.getElementById('success');

// A curated list of courses (demo)
const COURSES = [
  { code: "CS101", name: "BSc Computer Science", desc: "Algorithms, data structures, systems and software engineering." },
  { code: "IS110", name: "BCom Information Systems", desc: "Business processes, systems analysis, and digital strategy." },
  { code: "EE200", name: "BEng Electrical Engineering", desc: "Signals, electronics, power systems, and embedded design." },
  { code: "ME200", name: "BEng Mechanical Engineering", desc: "Mechanics, thermodynamics, and product design." },
  { code: "DS150", name: "BSc Data Science", desc: "Statistical modeling, ML, and data engineering." },
  { code: "LAW10", name: "LLB Law", desc: "Legal systems, case law, and jurisprudence." },
  { code: "ECO10", name: "BA Economics", desc: "Micro, macroeconomics, econometrics." },
  { code: "PSY10", name: "BA Psychology", desc: "Cognition, development, research methods." },
  { code: "NUR10", name: "B Nursing", desc: "Clinical care, anatomy, and public health." }
];

let currentUser = null;
let currentProfile = null;

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = "../login/login.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }
  currentUser = user;
  const snap = await getDoc(doc(db, "students", user.uid));
  if (!snap.exists()) {
    window.location.href = "../register/register.html";
    return;
  }
  currentProfile = snap.data();
  renderCourses();
  applyStateFromProfile();
});

function renderCourses() {
  grid.innerHTML = "";
  COURSES.forEach(c => {
    const el = document.createElement('div');
    el.className = "course-card";
    el.innerHTML = `
      <div class="row">
        <h4>${c.name}</h4>
        <input type="checkbox" data-code="${c.code}" />
      </div>
      <p>${c.desc}</p>
      <span class="muted">Code: ${c.code}</span>
    `;
    grid.appendChild(el);
  });

  grid.addEventListener('change', enforceMaxTwoSelections);
}

function enforceMaxTwoSelections() {
  const checks = [...grid.querySelectorAll('input[type="checkbox"]')];
  const selected = checks.filter(ch => ch.checked);
  if (selected.length > 2) {
    const last = selected[selected.length - 1];
    last.checked = false;
  }
}

function applyStateFromProfile() {
  const cs = currentProfile.courseSelection || {};
  const checks = [...grid.querySelectorAll('input[type="checkbox"]')];

  if (cs.choices?.length) {
    checks.forEach(ch => ch.checked = cs.choices.includes(ch.dataset.code));
  }

  if (cs.status === "pending") {
    info.textContent = "Your selection is pending review. You can update your choices until a decision is made.";
    successEl.textContent = "";
  } else if (cs.status === "approved") {
    info.textContent = `Approved for: ${cs.acceptedCourse}. You can no longer change your selection.`;
    checks.forEach(c => c.disabled = true);
    submitBtn.disabled = true;
  } else if (cs.status === "rejected") {
    info.textContent = "Your selection was rejected. Please choose again.";
  } else {
    info.textContent = "Pick up to two courses and submit for approval.";
  }
}

submitBtn.addEventListener('click', async () => {
  errorEl.textContent = "";
  successEl.textContent = "";

  const selectedCodes = [...grid.querySelectorAll('input[type="checkbox"]')]
    .filter(ch => ch.checked)
    .map(ch => ch.dataset.code);

  if (selectedCodes.length === 0) {
    errorEl.textContent = "Select at least one course.";
    return;
  }
  if (selectedCodes.length > 2) {
    errorEl.textContent = "You can select at most two courses.";
    return;
  }

  try {
    await updateDoc(doc(db, "students", currentUser.uid), {
      "courseSelection.choices": selectedCodes,
      "courseSelection.status": "pending",
      "courseSelection.submittedAt": serverTimestamp(),
      "courseSelection.acceptedCourse": null,
      "courseSelection.decisionAt": null
    });
    successEl.textContent = "Selection submitted. Await administrator approval.";
    info.textContent = "Your selection is pending review.";
  } catch (ex) {
    errorEl.textContent = ex.message || "Could not submit selection.";
  }
});
