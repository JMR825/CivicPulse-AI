"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, isMockFirebase } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "citizen" | "moderator" | "admin";
  trustScore: number;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signUpWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOutUser: () => Promise<void>;
  changeRole: (newRole: "citizen" | "moderator" | "admin") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      setLoading(true);
      if (firebaseUser) {
        // If we are in mock mode, the user already has role injected, let's load it
        if (isMockFirebase) {
          setUser(firebaseUser);
          setLoading(false);
          return;
        }

        try {
          // Fetch additional user details from Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName || firebaseUser.email?.split("@")[0] || "Citizen",
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
              role: userData.role || "citizen",
              trustScore: userData.trustScore || 50,
            });
            // Update last login
            await setDoc(userDocRef, { lastLoginAt: new Date().toISOString() }, { merge: true });
          } else {
            // Document does not exist, create default citizen profile
            const isFirstUserAdmin = firebaseUser.email?.includes("admin");
            const newUserData: Omit<AuthUser, "uid" | "photoURL"> = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Citizen",
              role: isFirstUserAdmin ? "admin" : "citizen",
              trustScore: isFirstUserAdmin ? 100 : 50,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newUserData);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: newUserData.displayName,
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
              role: newUserData.role,
              trustScore: newUserData.trustScore,
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Fallback to minimal info if Firestore query fails (e.g. permission rules)
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "Citizen",
            photoURL: firebaseUser.photoURL,
            role: "citizen",
            trustScore: 50,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      if (isMockFirebase) {
        return await auth.signInWithEmailAndPassword(email, pass);
      }
      return await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      if (isMockFirebase) {
        return await auth.signInWithEmailAndPassword(email, pass);
      }
      return await createUserWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      if (isMockFirebase) {
        return await auth.signInWithGoogle();
      }
      const provider = new GoogleAuthProvider();
      return await signInWithPopup(auth, provider);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (newRole: "citizen" | "moderator" | "admin") => {
    if (!user) return;
    setUser({ ...user, role: newRole });

    if (isMockFirebase) {
      // Mock db update
      const stored = localStorage.getItem("civicpulse_user");
      if (stored) {
        const u = JSON.parse(stored);
        u.role = newRole;
        localStorage.setItem("civicpulse_user", JSON.stringify(u));
      }
      const mockUsers = JSON.parse(localStorage.getItem("civicpulse_db_users") || "{}");
      if (mockUsers[user.uid]) {
        mockUsers[user.uid].role = newRole;
        localStorage.setItem("civicpulse_db_users", JSON.stringify(mockUsers));
      }
    } else {
      // Firestore update
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { role: newRole }, { merge: true });
      } catch (err) {
        console.error("Failed to update user role in Firestore:", err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOutUser,
        changeRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
