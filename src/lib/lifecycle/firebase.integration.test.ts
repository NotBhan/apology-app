// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getDb, getStorageBucket } from "@/lib/storage/firebase-admin";
import { FirestoreRepository } from "@/lib/storage/firestore-repository";
import { FirestorePurgeStore } from "@/lib/lifecycle/purge-store";
import { FirebaseUploadStore } from "@/lib/storage/upload-store";
import { runPurge } from "./purge";
import type { PurgeDeps } from "./purge";
import { computeExpiresAt } from "@/lib/expiry";

/**
 * The only test that proves the production code path works.
 *
 * Runs against the Firestore + Storage emulators. Skipped when the emulator is
 * not configured, so `npm test` stays hermetic; run it with:
 *
 *   npm run test:firebase
 *
 * It exercises the real Admin SDK, the real Firestore queries, and real object
 * storage — not fakes.
 */

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const suite = hasEmulator ? describe : describe.skip;

const COLLECTIONS = [
  "apologies",
  "uploads",
  "deletionJobs",
  "deletionTombstones",
  "rateLimits",
];

/** 1×1 PNG. */
const PNG = new Uint8Array(
  Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082",
    "hex",
  ),
);

const payload = {
  recipientName: "Ananya",
  senderName: "Rohan",
  situation: "fight" as const,
  situationCustom: "",
  language: "en" as const,
  messages: {
    message1: "I said too much.",
    message2: "You matter.",
    message3: "I will do better.",
    personalNote: "At 2am.",
  },
  themeId: "romantic" as const,
  stickerPackId: "cats" as const,
  customization: {
    audio: { source: "none" as const, volume: 0.5 },
    photos: [],
    memoryStyle: "polaroid" as const,
  },
  linkDurationDays: 1,
};

suite("firebase lifecycle (emulator)", () => {
  const owner = "owner-hash-emulator";
  let repository: FirestoreRepository;
  let store: FirestorePurgeStore;
  let uploads: FirebaseUploadStore;
  let deps: PurgeDeps;

  async function wipe() {
    const db = await getDb();
    for (const name of COLLECTIONS) {
      const snap = await db.collection(name).limit(200).get();
      await Promise.all(snap.docs.map((doc) => doc.ref.delete()));
    }
    const bucket = await getStorageBucket();
    const [files] = await bucket.getFiles({ prefix: "uploads/" });
    await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
  }

  beforeEach(async () => {
    repository = new FirestoreRepository();
    store = new FirestorePurgeStore();
    uploads = new FirebaseUploadStore();
    deps = { store, repository, uploads, leaseMs: 60_000 };
    // Each test starts from an empty project, so an assertion like
    // "exactly one record was deleted" means what it says.
    await wipe();
  });

  afterAll(async () => {
    await wipe();
  });

  it("publishes with a real expiry and hides the letter once it passes", async () => {
    const draft = await repository.createDraft(owner, {
      recipientName: "Ananya",
      senderName: "Rohan",
    });
    await repository.saveDraft(draft.id, owner, payload);
    const published = await repository.publish(draft.id, owner, 1);

    expect(published.expiresAt).toBeTruthy();
    expect(await repository.getPublishedByToken(published.accessToken)).toBeDefined();

    // Move the deadline into the past, as the clock would.
    const db = await getDb();
    await db.collection("apologies").doc(draft.id).update({
      expiresAt: computeExpiresAt(1, new Date(Date.now() - 2 * 86_400_000)),
    });

    expect(await repository.getPublishedByToken(published.accessToken)).toBeUndefined();
  });

  it("purges the record, its upload metadata and its stored objects", async () => {
    const draft = await repository.createDraft(owner, {
      recipientName: "Ananya",
      senderName: "Rohan",
    });
    await repository.saveDraft(draft.id, owner, payload);
    const published = await repository.publish(draft.id, owner, 1);

    const ids: string[] = [];
    for (const suffix of ["a", "b"]) {
      const asset = {
        id: `asset-${suffix}-${randomUUID()}`,
        kind: "photo" as const,
        mime: "image/png" as const,
        size: PNG.byteLength,
        createdAt: new Date().toISOString(),
        apologyId: draft.id,
        ownerKeyHash: owner,
      };
      await uploads.save(asset, PNG);
      ids.push(asset.id);
    }

    const db = await getDb();
    await db.collection("apologies").doc(draft.id).update({
      expiresAt: computeExpiresAt(1, new Date(Date.now() - 2 * 86_400_000)),
      "customization.photos": ids.map((id) => ({ id, url: `/api/uploads/${id}` })),
    });

    const bucket = await getStorageBucket();
    for (const id of ids) {
      const [exists] = await bucket.file(`uploads/${id}`).exists();
      expect(exists, `${id} should exist before purge`).toBe(true);
    }

    const report = await runPurge(deps);
    expect(report.deleted).toBe(1);

    // Record gone.
    expect(await repository.getDraft(draft.id)).toBeUndefined();
    expect(
      (await db.collection("apologies").doc(draft.id).get()).exists,
    ).toBe(false);

    // Token no longer resolves.
    expect(await repository.getPublishedByToken(published.accessToken)).toBeUndefined();

    // Object + metadata gone for every asset.
    for (const id of ids) {
      const [exists] = await bucket.file(`uploads/${id}`).exists();
      expect(exists, `${id} should be deleted`).toBe(false);
      const meta = await db.collection("uploads").doc(id).get();
      expect(meta.exists).toBe(false);
    }

    // Job cleared, tombstone written.
    expect(await store.getJob(draft.id)).toBeUndefined();
    const tomb = await db.collection("deletionTombstones").doc(draft.id).get();
    expect(tomb.exists).toBe(true);
    expect(JSON.stringify(tomb.data())).not.toContain("Ananya");
  });

  it("is idempotent and safe to run twice", async () => {
    const draft = await repository.createDraft(owner, {
      recipientName: "Ananya",
      senderName: "Rohan",
    });
    await repository.saveDraft(draft.id, owner, payload);
    await repository.publish(draft.id, owner, 1);

    const db = await getDb();
    await db.collection("apologies").doc(draft.id).update({
      expiresAt: computeExpiresAt(1, new Date(Date.now() - 2 * 86_400_000)),
    });

    const first = await runPurge(deps);
    expect(first.deleted).toBe(1);

    const second = await runPurge(deps);
    expect(second.deleted).toBe(0);
    expect(second.scanned).toBe(0);
  });

  it("does not renew a record whose cleanup has started", async () => {
    const draft = await repository.createDraft(owner, {
      recipientName: "Ananya",
      senderName: "Rohan",
    });
    await repository.saveDraft(draft.id, owner, payload);
    await repository.publish(draft.id, owner, 1);

    await store.claim(draft.id, Date.now(), 60_000);
    await expect(repository.publish(draft.id, owner, 3)).rejects.toThrow("DELETED");
  });

  it("leaves another owner's record untouched", async () => {
    const other = "owner-hash-other";
    const draft = await repository.createDraft(other, {
      recipientName: "Someone",
      senderName: "Else",
    });
    await repository.saveDraft(draft.id, other, payload);
    await repository.publish(draft.id, other, 7);

    await runPurge(deps);
    expect(await repository.getDraft(draft.id)).toBeDefined();
  });
});
