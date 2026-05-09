import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// 🔥 YOUR FIREBASE CONFIG (correct one)
const firebaseConfig = {
  apiKey: "AIzaSyDg_8NHoY5rWEyA-wJiZZhuuSoIhGhZzb0",
  authDomain: "cineai-a10d9.firebaseapp.com",
  databaseURL: "https://cineai-a10d9-default-rtdb.firebaseio.com",
  projectId: "cineai-a10d9",
  storageBucket: "cineai-a10d9.firebasestorage.app",
  messagingSenderId: "183891540781",
  appId: "1:183891540781:web:c7dd7a5c8537df613df1a4",
  databaseURL: "https://cineai-a10d9-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

// 🔐 LOGIN AUTH
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// 💬 REALTIME DB FOR ROOMS
export const db = getDatabase(app);
