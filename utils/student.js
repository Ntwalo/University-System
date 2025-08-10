// utils/student.js
// Student number helpers

import {
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Generate ST + 10 digits, e.g., ST0123456789
export function generateStudentNumber() {
  let digits = "";
  for (let i = 0; i < 10; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  return `ST${digits}`;
}

export function isValidStudentNumber(sn) {
  return /^ST\d{10}$/i.test(sn || "");
}

// Ensure uniqueness by checking Firestore "students" collection
export async function generateUniqueStudentNumber(db) {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const sn = generateStudentNumber();
    const q = query(collection(db, "students"), where("studentNumber", "==", sn));
    const snap = await getDocs(q);
    if (snap.empty) return sn;
  }
  throw new Error("Could not generate a unique student number. Try again.");
}
