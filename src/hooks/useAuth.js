import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref as dbRef, update, set, serverTimestamp } from "firebase/database";

export const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = dbRef(db, `users/${currentUser.uid}`);
        await update(userRef, {
          uid: currentUser.uid,
          email: currentUser.email || "",
          lastSeen: serverTimestamp(),
        });
      }
    });

    return unsubscribe;
  }, []);

  const handleSignIn = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const handleSignUp = async (email, password, name, address, phone) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const createdUser = userCredential.user;

    if (createdUser) {
      const userRef = dbRef(db, `users/${createdUser.uid}`);
      await set(userRef, {
        uid: createdUser.uid,
        email: createdUser.email || "",
        name,
        address,
        phone,
        createdAt: createdUser.metadata?.creationTime || "",
        lastSeen: serverTimestamp(),
        ordersCount: 0,
      });
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return { user, handleSignIn, handleSignUp, handleSignOut };
};
