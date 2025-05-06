// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from 'firebase/auth' ;

// 👇 このまま貼ってOK！（中身はそのまま）
const firebaseConfig = {
  apiKey: "AIzaSyCyM8rN7pEfTkKXvly-fr6_aZIyphcEm7Q",
  authDomain: "todo-app-a80ba.firebaseapp.com",
  projectId: "todo-app-a80ba",
  storageBucket: "todo-app-a80ba.firebasestorage.app",
  messagingSenderId: "1034723598409",
  appId: "1:1034723598409:web:d74a61a8648f8a46e95f98",
  measurementId: "G-22MWB1PN99"
};

const app = initializeApp(firebaseConfig);

// ✅ Firestoreを使うためのインスタンスを取得
export const db = getFirestore(app);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();