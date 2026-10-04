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
// COLLECTION
// ======================================================

const moneyTrackerCollection = collection(
  db,
  "moneyTracker"
);


// ======================================================
// CURRENT USER
// ======================================================

function getCurrentUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  return user;
}


// ======================================================
// GET ALL MONEY RECORDS
// ======================================================

export async function getMoneyRecords() {
  try {
    const user = getCurrentUser();

    const recordsQuery = query(
      moneyTrackerCollection,
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(recordsQuery);

    const records = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    records.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;

      return dateB - dateA;
    });

    return records;

  } catch (error) {
    console.error(
      "Error fetching money records:",
      error
    );

    throw error;
  }
}


// ======================================================
// GET SINGLE RECORD
// ======================================================

export async function getMoneyRecord(recordId) {
  try {
    const user = getCurrentUser();

    const recordReference = doc(
      db,
      "moneyTracker",
      recordId
    );

    const snapshot = await getDoc(recordReference);

    if (!snapshot.exists()) {
      return null;
    }

    const record = snapshot.data();

    if (record.userId !== user.uid) {
      return null;
    }

    return {
      id: snapshot.id,
      ...record,
    };

  } catch (error) {
    console.error(
      "Error fetching money record:",
      error
    );

    throw error;
  }
}


// ======================================================
// ADD MONEY RECORD
// ======================================================

export async function addMoneyRecord(record) {
  try {
    const user = getCurrentUser();

    const recordData = {
      userId: user.uid,

      personName: record.personName,

      type: record.type,

      amount: Number(record.amount),

      paidAmount: Number(record.paidAmount || 0),

      note: record.note || "",

      dueDate: record.dueDate || "",

      status: record.status || "pending",

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    const documentReference = await addDoc(
      moneyTrackerCollection,
      recordData
    );

    return {
      id: documentReference.id,
      ...recordData,
      amount: Number(record.amount),
      paidAmount: Number(record.paidAmount || 0),
    };

  } catch (error) {
    console.error(
      "Error adding money record:",
      error
    );

    throw error;
  }
}


// ======================================================
// UPDATE MONEY RECORD
// ======================================================

export async function updateMoneyRecord(
  recordId,
  record
) {
  try {
    const user = getCurrentUser();

    const recordReference = doc(
      db,
      "moneyTracker",
      recordId
    );

    const existingSnapshot = await getDoc(
      recordReference
    );

    if (!existingSnapshot.exists()) {
      throw new Error(
        "Money record not found."
      );
    }

    const existingRecord =
      existingSnapshot.data();

    if (existingRecord.userId !== user.uid) {
      throw new Error(
        "You are not allowed to update this record."
      );
    }

    const updatedData = {
      personName: record.personName,

      type: record.type,

      amount: Number(record.amount),

      paidAmount: Number(
        record.paidAmount || 0
      ),

      note: record.note || "",

      dueDate: record.dueDate || "",

      status: record.status || "pending",

      updatedAt: serverTimestamp(),
    };

    await updateDoc(
      recordReference,
      updatedData
    );

    return {
      id: recordId,
      ...updatedData,
    };

  } catch (error) {
    console.error(
      "Error updating money record:",
      error
    );

    throw error;
  }
}


// ======================================================
// DELETE MONEY RECORD
// ======================================================

export async function deleteMoneyRecord(recordId) {
  try {
    const user = getCurrentUser();

    const recordReference = doc(
      db,
      "moneyTracker",
      recordId
    );

    const existingSnapshot = await getDoc(
      recordReference
    );

    if (!existingSnapshot.exists()) {
      throw new Error(
        "Money record not found."
      );
    }

    const existingRecord =
      existingSnapshot.data();

    if (existingRecord.userId !== user.uid) {
      throw new Error(
        "You are not allowed to delete this record."
      );
    }

    await deleteDoc(recordReference);

    return true;

  } catch (error) {
    console.error(
      "Error deleting money record:",
      error
    );

    throw error;
  }
}