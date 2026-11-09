import "server-only";
import type { ApologyDraft, ApologyRecord, PublishedApology } from "@/types/apology";
import type { DraftPayload } from "@/lib/validation/apology";
import { constantTimeEqual, createAccessToken } from "@/lib/id";
import { DEFAULT_LINK_DAYS, computeExpiresAt, isLinkLive, normalizeDurationDays } from "@/lib/expiry";
import { toCreatorDraft, toPublished } from "./types";
import type { ApologyRepository } from "./types";
import { getDb } from "./firebase-admin";
import { getPurgeStore } from "@/lib/lifecycle/purge-store";

const COLLECTION = "apologies";

/**
 * Firestore-backed repository.
 *
 * Documents are never readable by clients: the client SDK is not used for
 * drafts or published letters. All access flows through server route handlers
 * which enforce ownership, published status and token validity here.
 *
 * `accessTokens/{token}` holds only `{ apologyId }` so a token can be revoked
 * by deleting a single document.
 */
export class FirestoreRepository implements ApologyRepository {
  private async collection() {
    const database = await getDb();
    return database.collection(COLLECTION);
  }

  async createDraft(
    ownerKeyHash: string,
    seed: { recipientName: string; senderName: string },
  ): Promise<ApologyRecord> {
    const col = await this.collection();
    const ref = col.doc();
    const now = new Date().toISOString();
    const record: ApologyRecord = {
      id: ref.id,
      accessToken: createAccessToken(),
      ownerKeyHash,
      recipientName: seed.recipientName,
      senderName: seed.senderName,
      situation: "other",
      situationCustom: "",
      language: "en",
      messages: { message1: "", message2: "", message3: "", personalNote: "" },
      themeId: "romantic",
      stickerPackId: "cats",
      customization: {
        audio: { source: "default", volume: 0.55 },
        photos: [],
        memoryStyle: "polaroid",
      },
      linkDurationDays: DEFAULT_LINK_DAYS,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(record);
    return record;
  }

  async getDraft(id: string): Promise<ApologyRecord | undefined> {
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return undefined;
    const col = await this.collection();
    const snap = await col.doc(id).get();
    if (!snap.exists) return undefined;
    return snap.data() as ApologyRecord;
  }

  async saveDraft(
    id: string,
    ownerKeyHash: string,
    payload: DraftPayload,
  ): Promise<ApologyRecord> {
    const existing = await this.getDraft(id);
    if (!existing) throw new Error("NOT_FOUND");
    if (!constantTimeEqual(existing.ownerKeyHash, ownerKeyHash)) throw new Error("FORBIDDEN");
    if (existing.status === "revoked") throw new Error("REVOKED");

    const updated: ApologyRecord = {
      ...existing,
      ...payload,
      id: existing.id,
      accessToken: existing.accessToken,
      ownerKeyHash: existing.ownerKeyHash,
      status: existing.status,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const col = await this.collection();
    await col.doc(id).set(updated, { merge: false });
    return updated;
  }

  async publish(
    id: string,
    ownerKeyHash: string,
    durationDays: number,
  ): Promise<ApologyRecord> {
    const existing = await this.getDraft(id);
    if (!existing) throw new Error("NOT_FOUND");
    if (!constantTimeEqual(existing.ownerKeyHash, ownerKeyHash)) throw new Error("FORBIDDEN");
    // Once cleanup has begun the record is on its way out; reviving it would
    // race the worker and could serve a half-deleted letter.
    if (await (await getPurgeStore()).hasStarted(id)) throw new Error("DELETED");

    const now = new Date();
    const window = normalizeDurationDays(durationDays);
    const updated: ApologyRecord = {
      ...existing,
      status: "published",
      linkDurationDays: window,
      expiresAt: computeExpiresAt(window, now),
      publishedAt: existing.publishedAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const col = await this.collection();
    await col.doc(id).set(updated);
    return updated;
  }

  async revoke(id: string, ownerKeyHash: string): Promise<ApologyRecord> {
    const existing = await this.getDraft(id);
    if (!existing) throw new Error("NOT_FOUND");
    if (!constantTimeEqual(existing.ownerKeyHash, ownerKeyHash)) throw new Error("FORBIDDEN");
    const updated: ApologyRecord = {
      ...existing,
      status: "revoked",
      updatedAt: new Date().toISOString(),
    };
    const col = await this.collection();
    await col.doc(id).set(updated);
    return updated;
  }

  async remove(id: string, ownerKeyHash: string): Promise<void> {
    const existing = await this.getDraft(id);
    if (!existing) return;
    if (!constantTimeEqual(existing.ownerKeyHash, ownerKeyHash)) throw new Error("FORBIDDEN");
    const col = await this.collection();
    await col.doc(id).delete();
  }

  async listByOwner(ownerKeyHash: string): Promise<ApologyDraft[]> {
    const col = await this.collection();
    const snap = await col.where("ownerKeyHash", "==", ownerKeyHash).limit(100).get();
    return snap.docs
      .map((doc) => doc.data() as ApologyRecord)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toCreatorDraft);
  }

  async getByToken(token: string): Promise<ApologyRecord | undefined> {
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return undefined;
    const col = await this.collection();
    const snap = await col.where("accessToken", "==", token).limit(1).get();
    if (snap.empty) return undefined;
    return snap.docs[0].data() as ApologyRecord;
  }

  async listExpired(nowIso: string, limit: number): Promise<ApologyRecord[]> {
    const col = await this.collection();
    // Single-field range query: no composite index required. Status is filtered
    // in code because this collection is small and mixed-status.
    const snap = await col.where("expiresAt", "<=", nowIso).limit(limit * 4).get();
    return snap.docs
      .map((doc) => doc.data() as ApologyRecord)
      .filter((record) => record.status === "published")
      .slice(0, limit);
  }

  async purge(id: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return;
    const col = await this.collection();
    await col.doc(id).delete();
  }

  async getPublishedByToken(token: string): Promise<PublishedApology | undefined> {
    const record = await this.getByToken(token);
    if (!record) return undefined;
    // Expired, revoked and never-published links are indistinguishable.
    if (!isLinkLive(record.status, record.expiresAt)) return undefined;
    return toPublished(record);
  }
}
