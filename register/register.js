// register/register.js (fixed: no sign-out race)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { generateUniqueStudentNumber } from "../utils/student.js";

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

const form = document.getElementById('registerForm');
const errorEl = document.getElementById('error');
const successEl = document.getElementById('success');
const studentNumberDisplay = document.getElementById('studentNumberDisplay');

function validate(formData) {
  const { firstName, lastName, email, gender, dob, password, confirmPassword } = formData;
  if (!firstName || !lastName || !email || !gender || !dob || !password || !confirmPassword)
    return "Please fill in all fields.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}

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
    // 1) Create auth user
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const uid = cred.user.uid;

    // 2) Generate unique student number
    const studentNumber = await generateUniqueStudentNumber(db);

    // 3) Write profile document (requires rules to allow this)
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

    studentNumberDisplay.textContent = studentNumber;
    successEl.classList.remove('hidden');
    form.reset();
  } catch (ex) {
    console.error(ex);
    // Friendlier messages for common cases
    const map = {
      "permission-denied": "Permission denied by Firestore rules. See step 2 below.",
      "unauthenticated": "You must be signed in to write. Try again.",
      "already-exists": "This email is already registered.",
      "invalid-argument": "Invalid data sent. Check required fields."
    };
    errorEl.textContent = map[ex.code] || ex.message || "Registration failed.";
  }
});
