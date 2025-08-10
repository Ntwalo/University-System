// login/login.js
// Login by student number + password (maps student number to email via Firestore)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { isValidStudentNumber } from "../utils/student.js";

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

const loginForm = document.getElementById('loginForm');
const errorEl = document.getElementById('error');
const forgotLink = document.getElementById('forgotLink');
const forgotModal = document.getElementById('forgotModal');
const closeForgot = document.getElementById('closeForgot');
const forgotForm = document.getElementById('forgotForm');
const forgotMsg = document.getElementById('forgotMsg');
const forgotErr = document.getElementById('forgotErr');

// Redirect if already authenticated
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "../dashboard/dashboard.html";
  }
});

async function findEmailByStudentNumber(studentNumber) {
  const q = query(collection(db, "students"), where("studentNumber", "==", studentNumber.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0].data();
  return doc.email;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const studentNumber = document.getElementById('studentNumber').value.trim();
  const password = document.getElementById('password').value;

  if (!isValidStudentNumber(studentNumber)) {
    errorEl.textContent = "Please enter a valid student number (ST followed by 10 digits).";
    return;
  }

  try {
    const email = await findEmailByStudentNumber(studentNumber);
    if (!email) {
      errorEl.textContent = "No account found for that student number.";
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "../dashboard/dashboard.html";
  } catch (err) {
    errorEl.textContent = err.message || "Login failed. Please try again.";
  }
});

// Forgot Password Flow
forgotLink.addEventListener('click', (e) => {
  e.preventDefault();
  forgotMsg.textContent = "";
  forgotErr.textContent = "";
  document.getElementById('forgotStudentNumber').value = "";
  forgotModal.classList.remove('hidden');
});

closeForgot.addEventListener('click', () => {
  forgotModal.classList.add('hidden');
});

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  forgotMsg.textContent = "";
  forgotErr.textContent = "";
  const sn = document.getElementById('forgotStudentNumber').value.trim();

  if (!isValidStudentNumber(sn)) {
    forgotErr.textContent = "Enter a valid student number (ST##########).";
    return;
  }

  try {
    const email = await findEmailByStudentNumber(sn);
    if (!email) {
      forgotErr.textContent = "No account found for that student number.";
      return;
    }
    await sendPasswordResetEmail(auth, email);
    forgotMsg.textContent = "Password reset link sent to your registered email.";
  } catch (err) {
    forgotErr.textContent = err.message || "Could not send reset email.";
  }
});
