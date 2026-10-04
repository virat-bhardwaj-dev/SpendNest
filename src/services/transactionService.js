import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db, auth } from "../firebase/config";


// ======================================================
// TRANSACTIONS COLLECTION
// ======================================================

const transactionsCollection = collection(
  db,
  "transactions"
);


// ======================================================
// GET CURRENT USER
// ======================================================

function getCurrentUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  return user;
}


// ======================================================
// GET ALL TRANSACTIONS
// ======================================================

export async function getTransactions() {
  try {
    const user = getCurrentUser();

    const transactionQuery = query(
      transactionsCollection,
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(transactionQuery);

    const transactions = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    // Sort newest first on the client.
    // This avoids requiring a Firestore composite index.
    transactions.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;

      return dateB - dateA;
    });

    return transactions;

  } catch (error) {
    console.error(
      "Error fetching transactions:",
      error
    );

    throw error;
  }
}


// ======================================================
// GET SINGLE TRANSACTION
// ======================================================

export async function getTransaction(transactionId) {
  try {
    const user = getCurrentUser();

    const transactionReference = doc(
      db,
      "transactions",
      transactionId
    );

    const snapshot = await getDoc(
      transactionReference
    );

    if (!snapshot.exists()) {
      return null;
    }

    const transaction = snapshot.data();

    // Make sure this transaction belongs
    // to the currently logged-in user.
    if (transaction.userId !== user.uid) {
      return null;
    }

    return {
      id: snapshot.id,
      ...transaction,
    };

  } catch (error) {
    console.error(
      "Error fetching transaction:",
      error
    );

    throw error;
  }
}


// ======================================================
// ADD TRANSACTION
// ======================================================

export async function addTransaction(
  transaction
) {
  try {
    const user = getCurrentUser();

    const transactionData = {
      userId: user.uid,

      type: transaction.type,

      amount: Number(transaction.amount),

      category: transaction.category,

      description:
        transaction.description || "",

      date: transaction.date,

      paymentMethod:
        transaction.paymentMethod || "Other",

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    const documentReference = await addDoc(
      transactionsCollection,
      transactionData
    );

    return {
      id: documentReference.id,
      ...transactionData,
      amount: Number(transaction.amount),
    };

  } catch (error) {
    console.error(
      "Error adding transaction:",
      error
    );

    throw error;
  }
}


// ======================================================
// UPDATE TRANSACTION
// ======================================================

export async function updateTransaction(
  transactionId,
  transaction
) {
  try {
    const user = getCurrentUser();

    const transactionReference = doc(
      db,
      "transactions",
      transactionId
    );

    // Check ownership before updating
    const existingSnapshot = await getDoc(
      transactionReference
    );

    if (!existingSnapshot.exists()) {
      throw new Error(
        "Transaction not found."
      );
    }

    const existingTransaction =
      existingSnapshot.data();

    if (
      existingTransaction.userId !==
      user.uid
    ) {
      throw new Error(
        "You are not allowed to update this transaction."
      );
    }

    const updatedData = {
      type: transaction.type,

      amount: Number(transaction.amount),

      category: transaction.category,

      description:
        transaction.description || "",

      date: transaction.date,

      paymentMethod:
        transaction.paymentMethod || "Other",

      updatedAt: serverTimestamp(),
    };

    await updateDoc(
      transactionReference,
      updatedData
    );

    return {
      id: transactionId,
      ...updatedData,
      amount: Number(transaction.amount),
    };

  } catch (error) {
    console.error(
      "Error updating transaction:",
      error
    );

    throw error;
  }
}


// ======================================================
// DELETE TRANSACTION
// ======================================================

export async function deleteTransaction(
  transactionId
) {
  try {
    const user = getCurrentUser();

    const transactionReference = doc(
      db,
      "transactions",
      transactionId
    );

    // Check ownership before deleting
    const existingSnapshot = await getDoc(
      transactionReference
    );

    if (!existingSnapshot.exists()) {
      throw new Error(
        "Transaction not found."
      );
    }

    const existingTransaction =
      existingSnapshot.data();

    if (
      existingTransaction.userId !==
      user.uid
    ) {
      throw new Error(
        "You are not allowed to delete this transaction."
      );
    }

    await deleteDoc(
      transactionReference
    );

    return true;

  } catch (error) {
    console.error(
      "Error deleting transaction:",
      error
    );

    throw error;
  }
}