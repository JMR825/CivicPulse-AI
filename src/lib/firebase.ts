import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if we have valid configs (e.g. apiKey is set)
const hasFirebaseConfig = 
  typeof window !== "undefined" && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "YOUR_API_KEY";

export let app: any = null;
export let auth: Auth | any = null;
export let db: Firestore | any = null;
export let storage: FirebaseStorage | any = null;
export const isMockFirebase = !hasFirebaseConfig;

if (!isMockFirebase) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Failed to initialize real Firebase:", error);
  }
} else {
  if (typeof window !== "undefined") {
    console.warn(
      "⚡ CivicPulse AI: Running in offline MOCK MODE. No Firebase configuration found. Data will persist in LocalStorage."
    );
  }
  
  // Set up mock auth and db classes to mimic Firebase SDK
  class MockAuth {
    currentUser: any = null;
    listeners: Function[] = [];

    constructor() {
      if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("civicpulse_user");
        if (storedUser) {
          this.currentUser = JSON.parse(storedUser);
        }
      }
    }

    onAuthStateChanged(callback: (user: any) => void) {
      this.listeners.push(callback);
      callback(this.currentUser);
      return () => {
        this.listeners = this.listeners.filter((l) => l !== callback);
      };
    }

    notify() {
      this.listeners.forEach((l) => l(this.currentUser));
    }

    async signInWithEmailAndPassword(email: string, pass: string) {
      // Allow any login for demo
      const uid = "mock-uid-" + email.replace(/[^a-zA-Z0-9]/g, "");
      const is_admin = email.includes("admin");
      const is_mod = email.includes("mod");
      const user = {
        uid,
        email,
        displayName: email.split("@")[0].toUpperCase(),
        role: is_admin ? "admin" : is_mod ? "moderator" : "citizen",
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
      };
      this.currentUser = user;
      localStorage.setItem("civicpulse_user", JSON.stringify(user));
      // Save user to mock db
      const mockUsers = JSON.parse(localStorage.getItem("civicpulse_db_users") || "{}");
      mockUsers[uid] = {
        uid,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        trustScore: is_admin ? 100 : 50,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      localStorage.setItem("civicpulse_db_users", JSON.stringify(mockUsers));
      this.notify();
      return { user };
    }

    async signInWithGoogle() {
      return this.signInWithEmailAndPassword("citizen.demo@civicpulse.gov", "password");
    }

    async signOut() {
      this.currentUser = null;
      localStorage.removeItem("civicpulse_user");
      this.notify();
    }
  }

  auth = new MockAuth();

  // Basic mock Firestore
  class MockFirestore {
    collection(collectionName: string) {
      return {
        doc: (docId?: string) => {
          const id = docId || Math.random().toString(36).substring(7);
          return {
            id,
            get: async () => {
              const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
              return {
                exists: () => !!data[id],
                data: () => data[id] || null,
                id,
              };
            },
            set: async (docData: any, options?: any) => {
              const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
              const existing = data[id] || {};
              const merged = options?.merge ? { ...existing, ...docData } : docData;
              data[id] = { ...merged, id };
              localStorage.setItem(`civicpulse_db_${collectionName}`, JSON.stringify(data));
              return { id };
            },
            update: async (docData: any) => {
              const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
              if (data[id]) {
                data[id] = { ...data[id], ...docData };
                localStorage.setItem(`civicpulse_db_${collectionName}`, JSON.stringify(data));
              }
              return { id };
            },
            delete: async () => {
              const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
              delete data[id];
              localStorage.setItem(`civicpulse_db_${collectionName}`, JSON.stringify(data));
            }
          };
        },
        add: async (docData: any) => {
          const id = Math.random().toString(36).substring(7);
          const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
          data[id] = { ...docData, id, createdAt: docData.createdAt || new Date().toISOString() };
          localStorage.setItem(`civicpulse_db_${collectionName}`, JSON.stringify(data));
          return { id };
        },
        get: async () => {
          const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
          const docs = Object.values(data).map((doc: any) => ({
            id: doc.id,
            data: () => doc,
          }));
          return { docs };
        }
      };
    }
  }

  db = new MockFirestore();

  storage = {
    ref: () => ({
      put: async (file: File) => {
        // Just return a local object URL or mock URL
        return {
          ref: {
            getDownloadURL: async () => URL.createObjectURL(file),
          },
        };
      },
    }),
  };
}
