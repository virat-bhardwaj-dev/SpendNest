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

const budgetsCollection = collection(db, "budgets");

function getCurrentUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  return user;
}

// GET BUDGETS
export async function getBudgets(month) {
  try {
    const user = getCurrentUser();

    const budgetsQuery = query(
      budgetsCollection,
      where("userId", "==", user.uid),
      where("month", "==", month)
    );

    const snapshot = await getDocs(budgetsQuery);

    const budgets = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    budgets.sort((a, b) =>
      (a.category || "").localeCompare(
        b.category || ""
      )
    );

    return budgets;
  } catch (error) {
    console.error("Error fetching budgets:", error);
    throw error;
  }
}

// ADD BUDGET
export async function addBudget(budget) {
  try {
    const user = getCurrentUser();

    const budgetData = {
      userId: user.uid,
      category: budget.category,
      amount: Number(budget.amount),
      month: budget.month,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const documentReference = await addDoc(
      budgetsCollection,
      budgetData
    );

    return {
      id: documentReference.id,
      ...budgetData,
    };
  } catch (error) {
    console.error("Error adding budget:", error);
    throw error;
  }
}

// UPDATE BUDGET
export async function updateBudget(
  budgetId,
  budget
) {
  try {
    const user = getCurrentUser();

    const budgetReference = doc(
      db,
      "budgets",
      budgetId
    );

    const existingSnapshot = await getDoc(
      budgetReference
    );

    if (!existingSnapshot.exists()) {
      throw new Error("Budget not found.");
    }

    const existingBudget =
      existingSnapshot.data();

    if (existingBudget.userId !== user.uid) {
      throw new Error(
        "You are not allowed to update this budget."
      );
    }

    const updatedData = {
      category: budget.category,
      amount: Number(budget.amount),
      month: budget.month,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(
      budgetReference,
      updatedData
    );

    return {
      id: budgetId,
      ...existingBudget,
      ...updatedData,
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    throw error;
  }
}

// DELETE BUDGET
export async function deleteBudget(budgetId) {
  try {
    const user = getCurrentUser();

    const budgetReference = doc(
      db,
      "budgets",
      budgetId
    );

    const existingSnapshot = await getDoc(
      budgetReference
    );

    if (!existingSnapshot.exists()) {
      throw new Error("Budget not found.");
    }

    const existingBudget =
      existingSnapshot.data();

    if (existingBudget.userId !== user.uid) {
      throw new Error(
        "You are not allowed to delete this budget."
      );
    }

    await deleteDoc(budgetReference);

    return true;
  } catch (error) {
    console.error("Error deleting budget:", error);
    throw error;
  }
}