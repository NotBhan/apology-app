import "server-only";

/**
 * Single place where the Firebase Admin SDK is initialised.
 *
 * Nothing here is imported by client code. Credentials come from the
 * environment only: they are never passed through a request, never stored in
 * Firestore, and never sent to a browser.
 *
 * The emulator is supported by setting FIRESTORE_EMULATOR_HOST (and optionally
 * FIREBASE_STORAGE_EMULATOR_HOST), which is how the repository contract suite
 * exercises this code path without a real project.
 */

const REPLACE_ESCAPED_NEWLINES = /\\n/g;

export function firebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

export function usingFirestoreEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

export function usingStorageEmulator(): boolean {
  return Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
}

/** True when records can be persisted at all (real credentials or emulator). */
export function firestoreAvailable(): boolean {
  return firebaseConfigured() || usingFirestoreEmulator();
}

async function ensureApp(): Promise<void> {
  const { getApps, initializeApp, cert } = await import("firebase-admin/app");

  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-apology";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(REPLACE_ESCAPED_NEWLINES, "\n");

  if ((usingFirestoreEmulator() || usingStorageEmulator()) && !firebaseConfigured()) {
    // The emulator needs a project id and nothing else.
    initializeApp({
      projectId,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`,
    });
    return;
  }

  if (!clientEmail || !privateKey) {
    throw new Error("Firebase is not configured.");
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? `${projectId}.firebasestorage.app`,
  });
}

export async function getStorageBucket(): Promise<import("@google-cloud/storage").Bucket> {
  await ensureApp();
  const { getStorage } = await import("firebase-admin/storage");
  return getStorage().bucket();
}

let dbInstance: import("firebase-admin/firestore").Firestore | null = null;

export async function getDb(): Promise<import("firebase-admin/firestore").Firestore> {
  // Firestore permits settings() exactly once per instance, so the handle is
  // memoised. Calling settings() on every request throws on the second call.
  if (dbInstance) return dbInstance;

  await ensureApp();
  const { getFirestore } = await import("firebase-admin/firestore");
  const db = getFirestore();
  // Undefined fields are common in optional draft data; dropping them keeps
  // writes from failing without widening the stored shape.
  db.settings({ ignoreUndefinedProperties: true });
  dbInstance = db;
  return db;
}
