import "server-only";
import type { ApologyRepository } from "./types";
import { FileRepository } from "./file-repository";
import { firebaseConfigured, firestoreAvailable } from "./firebase-admin";

let instance: ApologyRepository | null = null;

export { firebaseConfigured };

/**
 * Repository selection is centralized so every route goes through one
 * access-control implementation.
 *
 * - Firestore when service-account env vars (or the emulator) are present.
 * - Filesystem store for local development and self-hosting.
 */
export async function getRepository(): Promise<ApologyRepository> {
  if (instance) return instance;

  if (firestoreAvailable()) {
    const { FirestoreRepository } = await import("./firestore-repository");
    instance = new FirestoreRepository();
    return instance;
  }

  instance = new FileRepository();
  return instance;
}

export function repositoryBackend(): "firestore" | "filesystem" {
  return firestoreAvailable() ? "firestore" : "filesystem";
}

export function resetRepositoryForTests() {
  instance = null;
}

export type { ApologyRepository };
