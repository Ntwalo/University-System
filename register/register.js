// register/register.js
// Handles user registration, creates Auth user, writes profile to Firestore at students/<uid>

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyAXk05rcENJrLJWY8CZ5evgI7ZdmhUxdNY",
  authDomain: "universitysystem-aaf1c.firebaseapp.com",
  projectId: "universitysystem-aaf1c",
  storageBucket: "universitysystem-aaf1c.firebasestorage.app",
  messagingSenderId: "818148764428",
  appId: "1:818148764428:web:4f70a379349a5706607729",
  measurementId: "G-2XPE6BZNV8"
};

/* Initialize Firebase */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* DOM elements */
const form = document.getElementById('registerForm');
const errorEl = document.getElementById('error');
const successEl = document.getElementById('success');
const studentNumberDisplay = document.getElementById('studentNumberDisplay');

/* Generate student number */
function generateStudentNumber() {
  let digits = "";
  for (let i = 0; i < 10; i++) digits += Math.floor(Math.random() * 10);
  return `ST${digits}`;
}
async function generateUniqueStudentNumber() {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const sn = generateStudentNumber();
    const q = query(collection(db, "students"), where("studentNumber", "==", sn));
    const snap = await getDocs(q);
    if (snap.empty) return sn;
  }
  throw new Error("Could not generate a unique student number. Try again.");
}

/* Validate form data */
function validate(data) {
  const { firstName, lastName, email, gender, dob, password, confirmPassword } = data;
  if (!firstName || !lastName || !email || !gender || !dob || !password || !confirmPassword)
    return "Please fill in all fields.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}

/* Handle form submit */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  successEl.classList.add('hidden');

  const data = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim().toLowerCase(),
    gender: document.getElementById('gender').value,
    dob: document.getElementById('dob').value,
    password: document.getElementById('password').value,
    confirmPassword: document.getElementById('confirmPassword').value
  };

  const err = validate(data);
  if (err) { errorEl.textContent = err; return; }

  try {
    // 1) Create Auth user
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);

    // 2) Ensure auth state is synced so Firestore sees request.auth.uid
    await auth.currentUser.reload();
    const uid = cred.user.uid;

    // 3) Generate unique student number
    const studentNumber = await generateUniqueStudentNumber();

    // 4) Write profile to Firestore at students/<uid>
    await setDoc(doc(db, "students", uid), {
      uid,
      studentNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      gender: data.gender,
      dob: data.dob,
      role: "student",
      createdAt: serverTimestamp(),
      courseSelection: {
        choices: [],
        status: "none",
        acceptedCourse: null,
        submittedAt: null,
        decisionAt: null
      }
    });

    // 5) Show success UI
    studentNumberDisplay.textContent = studentNumber;
    successEl.classList.remove('hidden');
    form.reset();
  } catch (ex) {
    console.error(ex);
    const map = {
      "auth/email-already-in-use": "This email is already registered.",
      "permission-denied": "Permission denied by Firestore rules.",
      "unauthenticated": "You must be signed in to write. Try again."
    };
    errorEl.textContent = map[ex.code] || ex.message || "Registration failed.";
  }
});
