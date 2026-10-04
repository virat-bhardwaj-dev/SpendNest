import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB8LTMwgtsmLDATT7n7lHg2oc1K-E_wlCY",
  authDomain: "spendnest-e5419.firebaseapp.com",
  projectId: "spendnest-e5419",
  storageBucket: "spendnest-e5419.firebasestorage.app",
  messagingSenderId: "981995766218",
  appId: "1:981995766218:web:57107724a275089d630f33",
  measurementId: "G-3BPPQH30H6"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);