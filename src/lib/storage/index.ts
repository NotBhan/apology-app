import "server-only";
import type { ApologyRepository } from "./types";
import { FileRepository } from "./file-repository";

let instance: ApologyRepository | null = null;

export function firebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

/**
 * Repository selection is centralized so every route goes through one
 * access-control implementation.
 *
 * - Firebase Firestore when service-account env vars are present (production).
 * - Filesystem store for local development and self-hosting.
 */
export async function getRepository(): Promise<ApologyRepository> {
  if (instance) return instance;

  if (firebaseConfigured()) {
    const { FirestoreRepository } = await import("./firestore-repository");
    instance = new FirestoreRepository();
    return instance;
  }

  instance = new FileRepository();
  return instance;
}

export function resetRepositoryForTests() {
  instance = null;
}

export type { ApologyRepository };
