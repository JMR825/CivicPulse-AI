import * as admin from "firebase-admin";

const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

export let adminDb: any = null;
export let adminAuth: any = null;
export const isAdminMock = !hasServiceAccount;

if (!isAdminMock) {
  try {
    if ((admin as any).apps.length === 0) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
      (admin as any).initializeApp({
        credential: (admin as any).credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
    adminDb = (admin as any).firestore();
    adminAuth = (admin as any).auth();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
} else {
  // Local storage mock or server-side memory mock
  class MockAdminFirestore {
    collection(collectionName: string) {
      return {
        doc: (docId?: string) => {
          const id = docId || Math.random().toString(36).substring(7);
          return {
            id,
            get: async () => {
              if (typeof window === "undefined") {
                // Return dummy data in server-side mock
                return { exists: false, data: () => null };
              }
              const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
              return {
                exists: !!data[id],
                data: () => data[id] || null,
                id,
              };
            },
            set: async (docData: any, options?: any) => {
              if (typeof window !== "undefined") {
                const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
                const existing = data[id] || {};
                const merged = options?.merge ? { ...existing, ...docData } : docData;
                data[id] = { ...merged, id };
                localStorage.setItem(`civicpulse_db_${collectionName}`, JSON.stringify(data));
              }
              return { id };
            },
            update: async (docData: any) => {
              if (typeof window !== "undefined") {
                const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
                if (data[id]) {
                  data[id] = { ...data[id], ...docData };
                  localStorage.setItem(`civicpulse_db_${collectionName}`, JSON.stringify(data));
                }
              }
              return { id };
            },
            delete: async () => {
              if (typeof window !== "undefined") {
                const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
                delete data[id];
                localStorage.setItem(`civicpulse_db_${collectionName}`, JSON.stringify(data));
              }
            }
          };
        },
        add: async (docData: any) => {
          const id = Math.random().toString(36).substring(7);
          if (typeof window !== "undefined") {
            const data = JSON.parse(localStorage.getItem(`civicpulse_db_${collectionName}`) || "{}");
            data[id] = { ...docData, id, createdAt: new Date().toISOString() };
            localStorage.setItem(`civicpulse_db_${collectionName}`, JSON.stringify(data));
          }
          return { id };
        },
        get: async () => {
          if (typeof window === "undefined") {
            return { docs: [] };
          }
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

  adminDb = new MockAdminFirestore();
  
  adminAuth = {
    verifyIdToken: async (token: string) => {
      // Just decode basic mock info
      return {
        uid: "mock-uid-admin",
        email: "admin@civicpulse.gov",
        role: "admin",
      };
    },
    setCustomUserClaims: async (uid: string, claims: any) => {
      return {};
    }
  };
}
