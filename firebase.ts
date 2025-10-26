import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-53DNCV3PO496U_6fqYMnrr_moL8GgLQ",
  authDomain: "siopamb01.firebaseapp.com",
  projectId: "siopamb01",
  storageBucket: "siopamb01.appspot.com",
  messagingSenderId: "500057943461",
  appId: "1:500057943461:web:9fa495eb94838b79aa4c4c",
  measurementId: "G-KDE5YED75E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
