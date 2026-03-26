import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";

let cachedApp: App | null = null;
let cachedFirestore: Firestore | null = null;

export async function getFirebaseApp(): Promise<App> {
  if (cachedApp) return cachedApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin env vars not configured");
  }

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp!;
  }

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return cachedApp;
}

export async function getFirestoreDb(): Promise<Firestore> {
  if (cachedFirestore) return cachedFirestore;

  const app = await getFirebaseApp();
  const { getFirestore } = await import("firebase-admin/firestore");
  cachedFirestore = getFirestore(app);
  return cachedFirestore;
}

export async function isFirebaseConfigured(): Promise<boolean> {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}
