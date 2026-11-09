import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { UploadAsset } from "./uploads";
import { firebaseConfigured, getStorageBucket, usingStorageEmulator } from "./firebase-admin";

/**
 * Where uploaded bytes and their metadata live.
 *
 * Two implementations, one contract. The filesystem store is for local
 * development and long-lived Node hosts; the Firebase store is required on any
 * platform with an ephemeral disk (Vercel), because a draft record that survives
 * in Firestore while its photos vanish is worse than no uploads at all.
 */
export interface UploadStore {
  readonly backend: "filesystem" | "firebase";
  save(asset: UploadAsset, bytes: Uint8Array): Promise<void>;
  read(id: string): Promise<{ asset: UploadAsset; bytes: Uint8Array } | undefined>;
  list(): Promise<UploadAsset[]>;
  remove(id: string): Promise<void>;
  /** Existence probe, used to verify that a purge really removed the bytes. */
  stat(id: string): Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/* Filesystem                                                                 */
/* -------------------------------------------------------------------------- */

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");

function assetPath(id: string) {
  return path.join(UPLOADS_DIR, id);
}

function metaPath(id: string) {
  return path.join(UPLOADS_DIR, `${id}.json`);
}

async function ensureDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
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
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export class FileUploadStore implements UploadStore {
  readonly backend = "filesystem" as const;

  async save(asset: UploadAsset, bytes: Uint8Array): Promise<void> {
    await ensureDir();
    const target = assetPath(asset.id);
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, bytes);
    await fs.rename(tmp, target);
    await writeJson(metaPath(asset.id), asset);
  }

  async read(id: string) {
    const asset = await readJson<UploadAsset>(metaPath(id));
    if (!asset) return undefined;
    try {
      const file = await fs.readFile(assetPath(id));
      const bytes = new Uint8Array(file.byteLength);
      bytes.set(file);
      return { asset, bytes };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async list(): Promise<UploadAsset[]> {
    await ensureDir();
    const entries = await fs.readdir(UPLOADS_DIR);
    const assets = await Promise.all(
      entries
        .filter((name) => name.endsWith(".json"))
        .map((name) => readJson<UploadAsset>(path.join(UPLOADS_DIR, name))),
    );
    return assets
      .filter((asset): asset is UploadAsset => Boolean(asset))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async remove(id: string): Promise<void> {
    await Promise.all([
      fs.rm(assetPath(id), { force: true }),
      fs.rm(metaPath(id), { force: true }),
    ]);
  }

  async stat(id: string): Promise<boolean> {
    try {
      await fs.access(assetPath(id));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Firebase Storage + Firestore metadata                                      */
/* -------------------------------------------------------------------------- */

const BUCKET_PREFIX = "uploads";

export function firebaseStorageConfigured(): boolean {
  return firebaseConfigured() || usingStorageEmulator();
}

export class FirebaseUploadStore implements UploadStore {
  readonly backend = "firebase" as const;

  private bucketPromise: Promise<import("@google-cloud/storage").Bucket> | null = null;
  private metaPromise: Promise<import("firebase-admin/firestore").Firestore> | null = null;

  /** Shares app + bucket initialisation with the repository, emulator included. */
  private async bucket() {
    if (!this.bucketPromise) {
      this.bucketPromise = getStorageBucket();
    }
    return this.bucketPromise;
  }

  private async meta() {
    if (!this.metaPromise) {
      this.metaPromise = (async () => {
        const { getDb } = await import("./firebase-admin");
        return getDb();
      })();
    }
    return this.metaPromise;
  }

  private objectName(id: string) {
    return `${BUCKET_PREFIX}/${id}`;
  }

  async save(asset: UploadAsset, bytes: Uint8Array): Promise<void> {
    const bucket = await this.bucket();
    const file = bucket.file(this.objectName(asset.id));

    await file.save(Buffer.from(bytes), {
      resumable: false,
      contentType: asset.mime,
      metadata: {
        cacheControl: "private, max-age=31536000, immutable",
        metadata: { assetId: asset.id, kind: asset.kind },
      },
    });

    const db = await this.meta();
    await db.collection("uploads").doc(asset.id).set(asset);
  }

  async read(id: string) {
    const db = await this.meta();
    const snap = await db.collection("uploads").doc(id).get();
    if (!snap.exists) return undefined;

    const asset = snap.data() as UploadAsset;
    const bucket = await this.bucket();
    try {
      const [buffer] = await bucket.file(this.objectName(id)).download();
      const bytes = new Uint8Array(buffer.byteLength);
      bytes.set(buffer);
      return { asset, bytes };
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code === 404) return undefined;
      throw error;
    }
  }

  async list(): Promise<UploadAsset[]> {
    const db = await this.meta();
    const snap = await db
      .collection("uploads")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    return snap.docs.map((doc) => doc.data() as UploadAsset);
  }

  async remove(id: string): Promise<void> {
    const db = await this.meta();
    const bucket = await this.bucket();
    await Promise.all([
      bucket.file(this.objectName(id)).delete({ ignoreNotFound: true }),
      db.collection("uploads").doc(id).delete(),
    ]);
  }

  async stat(id: string): Promise<boolean> {
    const bucket = await this.bucket();
    const [exists] = await bucket.file(this.objectName(id)).exists();
    return exists;
  }
}
