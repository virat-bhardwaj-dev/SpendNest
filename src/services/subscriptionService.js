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

const subscriptionsCollection = collection(
  db,
  "subscriptions"
);

function getCurrentUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  return user;
}

// GET SUBSCRIPTIONS
export async function getSubscriptions() {
  try {
    const user = getCurrentUser();

    const subscriptionsQuery = query(
      subscriptionsCollection,
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(
      subscriptionsQuery
    );

    const subscriptions = snapshot.docs.map(
      (document) => ({
        id: document.id,
        ...document.data(),
      })
    );

    subscriptions.sort((a, b) => {
      return (
        (a.nextPaymentDate || "").localeCompare(
          b.nextPaymentDate || ""
        )
      );
    });

    return subscriptions;
  } catch (error) {
    console.error(
      "Error fetching subscriptions:",
      error
    );

    throw error;
  }
}

// ADD SUBSCRIPTION
export async function addSubscription(
  subscription
) {
  try {
    const user = getCurrentUser();

    const subscriptionData = {
      userId: user.uid,

      name: subscription.name,

      amount: Number(subscription.amount),

      billingCycle:
        subscription.billingCycle || "monthly",

      nextPaymentDate:
        subscription.nextPaymentDate || "",

      category:
        subscription.category || "Other",

      note: subscription.note || "",

      status: subscription.status || "active",

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    const documentReference = await addDoc(
      subscriptionsCollection,
      subscriptionData
    );

    return {
      id: documentReference.id,
      ...subscriptionData,
    };
  } catch (error) {
    console.error(
      "Error adding subscription:",
      error
    );

    throw error;
  }
}

// UPDATE SUBSCRIPTION
export async function updateSubscription(
  subscriptionId,
  subscription
) {
  try {
    const user = getCurrentUser();

    const subscriptionReference = doc(
      db,
      "subscriptions",
      subscriptionId
    );

    const existingSnapshot = await getDoc(
      subscriptionReference
    );

    if (!existingSnapshot.exists()) {
      throw new Error(
        "Subscription not found."
      );
    }

    const existingSubscription =
      existingSnapshot.data();

    if (
      existingSubscription.userId !== user.uid
    ) {
      throw new Error(
        "You are not allowed to update this subscription."
      );
    }

    const updatedData = {
      name: subscription.name,

      amount: Number(subscription.amount),

      billingCycle:
        subscription.billingCycle || "monthly",

      nextPaymentDate:
        subscription.nextPaymentDate || "",

      category:
        subscription.category || "Other",

      note: subscription.note || "",

      status:
        subscription.status || "active",

      updatedAt: serverTimestamp(),
    };

    await updateDoc(
      subscriptionReference,
      updatedData
    );

    return {
      id: subscriptionId,

      ...existingSubscription,

      ...updatedData,
    };
  } catch (error) {
    console.error(
      "Error updating subscription:",
      error
    );

    throw error;
  }
}

// DELETE SUBSCRIPTION
export async function deleteSubscription(
  subscriptionId
) {
  try {
    const user = getCurrentUser();

    const subscriptionReference = doc(
      db,
      "subscriptions",
      subscriptionId
    );

    const existingSnapshot = await getDoc(
      subscriptionReference
    );

    if (!existingSnapshot.exists()) {
      throw new Error(
        "Subscription not found."
      );
    }

    const existingSubscription =
      existingSnapshot.data();

    if (
      existingSubscription.userId !== user.uid
    ) {
      throw new Error(
        "You are not allowed to delete this subscription."
      );
    }

    await deleteDoc(subscriptionReference);

    return true;
  } catch (error) {
    console.error(
      "Error deleting subscription:",
      error
    );

    throw error;
  }
}