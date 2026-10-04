import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase/config";


// ======================================================
// GOOGLE PROVIDER
// ======================================================

const googleProvider = new GoogleAuthProvider();


// ======================================================
// GOOGLE LOGIN
// ======================================================

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(
      auth,
      googleProvider
    );

    return result.user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}


// ======================================================
// LOGOUT
// ======================================================

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}