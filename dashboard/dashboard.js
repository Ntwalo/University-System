// dashboard/dashboard.js
// Shows profile + status; admin can approve pending course selections

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc, serverTimestamp,
  collection, query, where, getDocs
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
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

const logoutBtn = document.getElementById('logoutBtn');
const greeting = document.getElementById('greeting');
const nameEl = document.getElementById('name');
const snEl = document.getElementById('studentNumber');
const emailEl = document.getElementById('email');
const statusEl = document.getElementById('status');
const choicesEl = document.getElementById('choices');
const acceptedEl = document.getElementById('acceptedCourse');
const adminPanel = document.getElementById('adminPanel');
const pendingList = document.getElementById('pendingList');

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = "../login/login.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }
  const snap = await getDoc(doc(db, "students", user.uid));
  if (!snap.exists()) {
    // Profile missing, force logout
    await signOut(auth);
    window.location.href = "../register/register.html";
    return;
  }
  const data = snap.data();
  renderProfile(data);
  if (data.role === "admin") {
    adminPanel.classList.remove('hidden');
    loadPending();
  } else {
    adminPanel.classList.add('hidden');
  }
});

function renderProfile(data) {
  greeting.textContent = `Hello, ${data.firstName} 👋`;
  nameEl.textContent = `${data.firstName} ${data.lastName}`;
  snEl.textContent = data.studentNumber;
  emailEl.textContent = data.email;

  const cs = data.courseSelection || {};
  statusEl.textContent = (cs.status || 'none').toUpperCase();
  choicesEl.textContent = (cs.choices && cs.choices.length > 0) ? cs.choices.join(", ") : '—';
  acceptedEl.textContent = cs.acceptedCourse || '—';
}

async function loadPending() {
  pendingList.innerHTML = "<p class='muted'>Loading pending selections…</p>";
  const q = query(collection(db, "students"), where("courseSelection.status", "==", "pending"));
  const snap = await getDocs(q);

  if (snap.empty) {
    pendingList.innerHTML = "<p class='muted'>No pending selections right now.</p>";
    return;
  }

  pendingList.innerHTML = "";
  snap.forEach(docSnap => {
    const s = docSnap.data();
    const choices = (s.courseSelection?.choices || []);
    const uid = s.uid;
    const id = `select-${uid}`;

    const card = document.createElement('div');
    card.className = 'pending-card';
    card.innerHTML = `
      <div class="row between" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div>
          <div><strong>${s.firstName} ${s.lastName}</strong> • <span class="badge">${s.studentNumber}</span></div>
          <div class="choice-group">
            ${choices.map(c => `<span class="badge">${c}</span>`).join('')}
          </div>
        </div>
        <div>
          <label for="${id}">Accept:</label>
          <select id="${id}">
            <option value="">Select course</option>
            ${choices.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <button class="btn primary" data-approve="${uid}">Approve</button>
          <button class="btn" data-reject="${uid}">Reject</button>
        </div>
      </div>
    `;
    pendingList.appendChild(card);
  });

  pendingList.addEventListener('click', async (e) => {
    const approveUid = e.target.getAttribute('data-approve');
    const rejectUid = e.target.getAttribute('data-reject');

    if (approveUid) {
      const select = document.getElementById(`select-${approveUid}`);
      const chosen = select?.value;
      if (!chosen) {
        alert("Please select an accepted course.");
        return;
      }
      await updateDoc(doc(db, "students", approveUid), {
        "courseSelection.status": "approved",
        "courseSelection.acceptedCourse": chosen,
        "courseSelection.decisionAt": serverTimestamp()
      });
      await loadPending();
      alert("Selection approved.");
    }

    if (rejectUid) {
      await updateDoc(doc(db, "students", rejectUid), {
        "courseSelection.status": "rejected",
        "courseSelection.acceptedCourse": null,
        "courseSelection.decisionAt": serverTimestamp()
      });
      await loadPending();
      alert("Selection rejected.");
    }
  }, { once: true });
}
