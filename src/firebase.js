import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:
    "https://gift-store-64745-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gift-store-64745",
  storageBucket: "gift-store-64745.firebasestorage.app",
  messagingSenderId: "962208394976",
  appId: "1:962208394976:web:f4a1502d3b44310f62aa85",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db };
