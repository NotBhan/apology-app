import "server-only";
import type { ApologyRepository } from "./types";
import { PostgresRepository } from "./postgres-repository";
import { ObjectStore } from "./object-store";
import { FilebaseObjectStore } from "./filebase-store";

/**
 * Adapter selection.
 *
 * There is exactly one production backend. No filesystem fallback: without
 * `DATABASE_URL` the repository throws when constructed, rather than silently
 * writing to an ephemeral disk.
 */

let repository: ApologyRepository | null = null;
let objects: ObjectStore | null = null;

export function getRepository(): ApologyRepository {
  if (!repository) repository = new PostgresRepository();
  return repository;
}

export function getObjectStore(): ObjectStore {
  if (!objects) objects = FilebaseObjectStore.fromEnv();
  return objects;
}

export function repositoryBackend(): "postgres" {
  return "postgres";
}

export function resetStorageForTests() {
  repository = null;
  objects = null;
}

export type { ApologyRepository };
