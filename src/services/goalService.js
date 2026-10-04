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

const goalsCollection = collection(db, "goals");

function getCurrentUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  return user;
}

// GET GOALS
export async function getGoals() {
  try {
    const user = getCurrentUser();

    const goalsQuery = query(
      goalsCollection,
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(goalsQuery);

    const goals = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    goals.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;

      return dateB - dateA;
    });

    return goals;
  } catch (error) {
    console.error("Error fetching goals:", error);
    throw error;
  }
}

// ADD GOAL
export async function addGoal(goal) {
  try {
    const user = getCurrentUser();

    const goalData = {
      userId: user.uid,
      name: goal.name,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount || 0),
      deadline: goal.deadline || "",
      note: goal.note || "",
      status: goal.status || "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const documentReference = await addDoc(
      goalsCollection,
      goalData
    );

    return {
      id: documentReference.id,
      ...goalData,
    };
  } catch (error) {
    console.error("Error adding goal:", error);
    throw error;
  }
}

// UPDATE GOAL
export async function updateGoal(goalId, goal) {
  try {
    const user = getCurrentUser();

    const goalReference = doc(db, "goals", goalId);

    const existingSnapshot = await getDoc(goalReference);

    if (!existingSnapshot.exists()) {
      throw new Error("Goal not found.");
    }

    const existingGoal = existingSnapshot.data();

    if (existingGoal.userId !== user.uid) {
      throw new Error(
        "You are not allowed to update this goal."
      );
    }

    const targetAmount = Number(goal.targetAmount);
    const currentAmount = Number(goal.currentAmount || 0);

    const updatedData = {
      name: goal.name,
      targetAmount,
      currentAmount,
      deadline: goal.deadline || "",
      note: goal.note || "",
      status:
        currentAmount >= targetAmount
          ? "completed"
          : "active",
      updatedAt: serverTimestamp(),
    };

    await updateDoc(goalReference, updatedData);

    return {
      id: goalId,
      ...existingGoal,
      ...updatedData,
    };
  } catch (error) {
    console.error("Error updating goal:", error);
    throw error;
  }
}

// DELETE GOAL
export async function deleteGoal(goalId) {
  try {
    const user = getCurrentUser();

    const goalReference = doc(db, "goals", goalId);

    const existingSnapshot = await getDoc(goalReference);

    if (!existingSnapshot.exists()) {
      throw new Error("Goal not found.");
    }

    const existingGoal = existingSnapshot.data();

    if (existingGoal.userId !== user.uid) {
      throw new Error(
        "You are not allowed to delete this goal."
      );
    }

    await deleteDoc(goalReference);

    return true;
  } catch (error) {
    console.error("Error deleting goal:", error);
    throw error;
  }
}