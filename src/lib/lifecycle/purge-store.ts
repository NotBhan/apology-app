import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomId } from "@/lib/id";
import type { DeletionJob, DeletionTombstone } from "./types";

/**
 * Persistence for deletion jobs and tombstones.
 *
 * Kept separate from `ApologyRepository` so the purge worker can be tested with
 * either backend and so neither backend has to grow content-aware methods it
 * does not need.
 */
export interface PurgeStore {
  readonly backend: "filesystem" | "firestore";
  /** Jobs that are due for another attempt (lease expired or never set). */
  listRetryable(now: number, limit: number): Promise<DeletionJob[]>;
  getJob(apologyId: string): Promise<DeletionJob | undefined>;
  saveJob(job: DeletionJob): Promise<void>;
  removeJob(apologyId: string): Promise<void>;
  /**
   * Takes a lease on a job. Returns false when another worker holds a live
   * lease, which is what makes concurrent purge runs safe.
   */
  claim(apologyId: string, now: number, leaseMs: number): Promise<boolean>;
  writeTombstone(tombstone: DeletionTombstone): Promise<void>;
  listTombstones(ownerKeyHash: string): Promise<DeletionTombstone[]>;
  /** True when cleanup has started for this apology (blocks renewal). */
  hasStarted(apologyId: string): Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/* Filesystem                                                                 */
/* -------------------------------------------------------------------------- */

const ROOT = path.join(process.cwd(), ".data");
const JOBS = path.join(ROOT, "deletions");
const TOMBS = path.join(ROOT, "tombstones");

/** Only ids we minted can become paths. */
const ID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;

function safeId(id: string): string | null {
  return ID_PATTERN.test(id) ? id : null;
}

function jobPath(id: string) {
  return path.join(JOBS, `${id}.json`);
}

function tombPath(id: string) {
  return path.join(TOMBS, `${id}.json`);
}

async function ensure(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function writeJson(file: string, value: unknown) {
  const tmp = `${file}.${process.pid}.${randomId(6)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

/** Serialises claim/complete per apology id within this process. */
const locks = new Map<string, Promise<unknown>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  locks.set(
    key,
    next.catch(() => undefined),
  );
  try {
    return await next;
  } finally {
    if (locks.get(key) === next) locks.delete(key);
  }
}

export class FilePurgeStore implements PurgeStore {
  readonly backend = "filesystem" as const;

  async listRetryable(now: number, limit: number): Promise<DeletionJob[]> {
    await ensure(JOBS);
    const entries = await fs.readdir(JOBS);
    const jobs: DeletionJob[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const job = await readJson<DeletionJob>(path.join(JOBS, entry));
      if (!job) continue;
      if (job.leaseUntil && job.leaseUntil > now) continue;
      jobs.push(job);
      if (jobs.length >= limit) break;
    }
    return jobs;
  }

  async getJob(apologyId: string): Promise<DeletionJob | undefined> {
    const id = safeId(apologyId);
    if (!id) return undefined;
    return readJson<DeletionJob>(jobPath(id));
  }

  async saveJob(job: DeletionJob): Promise<void> {
    const id = safeId(job.apologyId);
    if (!id) return;
    await ensure(JOBS);
    await writeJson(jobPath(id), job);
  }

  async removeJob(apologyId: string): Promise<void> {
    const id = safeId(apologyId);
    if (!id) return;
    await fs.rm(jobPath(id), { force: true });
  }

  async claim(apologyId: string, now: number, leaseMs: number): Promise<boolean> {
    const id = safeId(apologyId);
    if (!id) return false;

    return withLock(id, async () => {
      await ensure(JOBS);
      const existing = await readJson<DeletionJob>(jobPath(id));
      if (existing?.leaseUntil && existing.leaseUntil > now) return false;

      const job: DeletionJob = existing ?? {
        apologyId: id,
        assetIds: [],
        attempts: 0,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      };

      job.leaseUntil = now + leaseMs;
      job.updatedAt = new Date(now).toISOString();
      await writeJson(jobPath(id), job);
      return true;
    });
  }

  async writeTombstone(tombstone: DeletionTombstone): Promise<void> {
    const id = safeId(tombstone.apologyId);
    if (!id) return;
    await ensure(TOMBS);
    await writeJson(tombPath(id), tombstone);
  }

  async listTombstones(ownerKeyHash: string): Promise<DeletionTombstone[]> {
    await ensure(TOMBS);
    const entries = await fs.readdir(TOMBS);
    const tombstones: DeletionTombstone[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const tomb = await readJson<DeletionTombstone>(path.join(TOMBS, entry));
      if (tomb && tomb.ownerKeyHash === ownerKeyHash) tombstones.push(tomb);
    }
    return tombstones.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  }

  async hasStarted(apologyId: string): Promise<boolean> {
    const job = await this.getJob(apologyId);
    return Boolean(job);
  }
}

/* -------------------------------------------------------------------------- */
/* Firestore                                                                  */
/* -------------------------------------------------------------------------- */

const JOBS_COLLECTION = "deletionJobs";
const TOMBS_COLLECTION = "deletionTombstones";

export class FirestorePurgeStore implements PurgeStore {
  readonly backend = "firestore" as const;

  private async db() {
    const { getDb } = await import("@/lib/storage/firebase-admin");
    return getDb();
  }

  async listRetryable(now: number, limit: number): Promise<DeletionJob[]> {
    const db = await this.db();
    // Filter on the lease only; a where-clause on leaseUntil would need a
    // composite index and jobs are few, so the residual filter is in code.
    const snap = await db.collection(JOBS_COLLECTION).orderBy("updatedAt", "asc").limit(limit).get();
    return snap.docs
      .map((doc) => doc.data() as DeletionJob)
      .filter((job) => !job.leaseUntil || job.leaseUntil <= now);
  }

  async getJob(apologyId: string): Promise<DeletionJob | undefined> {
    const db = await this.db();
    const snap = await db.collection(JOBS_COLLECTION).doc(apologyId).get();
    return snap.exists ? (snap.data() as DeletionJob) : undefined;
  }

  async saveJob(job: DeletionJob): Promise<void> {
    const db = await this.db();
    await db.collection(JOBS_COLLECTION).doc(job.apologyId).set(job);
  }

  async removeJob(apologyId: string): Promise<void> {
    const db = await this.db();
    await db.collection(JOBS_COLLECTION).doc(apologyId).delete();
  }

  async claim(apologyId: string, now: number, leaseMs: number): Promise<boolean> {
    const db = await this.db();
    const ref = db.collection(JOBS_COLLECTION).doc(apologyId);

    try {
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const existing = snap.exists ? (snap.data() as DeletionJob) : undefined;
        if (existing?.leaseUntil && existing.leaseUntil > now) return false;

        const job: DeletionJob = existing ?? {
          apologyId,
          assetIds: [],
          attempts: 0,
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        };
        job.leaseUntil = now + leaseMs;
        job.updatedAt = new Date(now).toISOString();
        tx.set(ref, job);
        return true;
      });
    } catch {
      // Transaction contention means someone else claimed it.
      return false;
    }
  }

  async writeTombstone(tombstone: DeletionTombstone): Promise<void> {
    const db = await this.db();
    await db.collection(TOMBS_COLLECTION).doc(tombstone.apologyId).set(tombstone);
  }

  async listTombstones(ownerKeyHash: string): Promise<DeletionTombstone[]> {
    const db = await this.db();
    const snap = await db
      .collection(TOMBS_COLLECTION)
      .where("ownerKeyHash", "==", ownerKeyHash)
      .limit(100)
      .get();
    return snap.docs
      .map((doc) => doc.data() as DeletionTombstone)
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  }

  async hasStarted(apologyId: string): Promise<boolean> {
    const db = await this.db();
    const snap = await db.collection(JOBS_COLLECTION).doc(apologyId).get();
    return snap.exists;
  }
}

/* -------------------------------------------------------------------------- */
/* Selection                                                                  */
/* -------------------------------------------------------------------------- */

let store: PurgeStore | null = null;

export async function getPurgeStore(): Promise<PurgeStore> {
  if (store) return store;
  const { firestoreAvailable } = await import("@/lib/storage/firebase-admin");
  store = firestoreAvailable() ? new FirestorePurgeStore() : new FilePurgeStore();
  return store;
}

export function resetPurgeStoreForTests() {
  store = null;
}
