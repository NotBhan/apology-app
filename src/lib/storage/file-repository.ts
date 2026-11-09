import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ApologyDraft, ApologyRecord, PublishedApology } from "@/types/apology";
import type { DraftPayload } from "@/lib/validation/apology";
import { constantTimeEqual, createAccessToken } from "@/lib/id";
import { DEFAULT_LINK_DAYS, computeExpiresAt, isLinkLive, normalizeDurationDays } from "@/lib/expiry";
import { toCreatorDraft, toPublished } from "./types";
import { getPurgeStore } from "@/lib/lifecycle/purge-store";
import type { ApologyRepository } from "./types";

const ROOT = path.join(process.cwd(), ".data");
const RECORDS = path.join(ROOT, "apologies");
const INDEX = path.join(ROOT, "index");

async function ensureDirs() {
  await fs.mkdir(RECORDS, { recursive: true });
  await fs.mkdir(INDEX, { recursive: true });
}

function recordPath(id: string) {
  return path.join(RECORDS, `${id}.json`);
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
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

async function claim(ownerKeyHash: string, id: string) {
  const file = path.join(INDEX, `owner-${safeName(ownerKeyHash)}.json`);
  const ids = (await readJson<string[]>(file)) ?? [];
  if (!ids.includes(id)) ids.push(id);
  await writeJson(file, ids);
}

/** Token index stores only the owning record id — never the payload. */
async function indexToken(token: string, id: string) {
  await writeJson(path.join(INDEX, `token-${safeName(token)}.json`), { id });
}

export class FileRepository implements ApologyRepository {
  async createDraft(
    ownerKeyHash: string,
    seed: { recipientName: string; senderName: string },
  ): Promise<ApologyRecord> {
    await ensureDirs();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: ApologyRecord = {
      id,
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
    await writeJson(recordPath(id), record);
    await claim(ownerKeyHash, id);
    await indexToken(record.accessToken, id);
    return record;
  }

  async getDraft(id: string): Promise<ApologyRecord | undefined> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    return readJson<ApologyRecord>(recordPath(id));
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
    await writeJson(recordPath(id), updated);
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
    await writeJson(recordPath(id), updated);
    await indexToken(updated.accessToken, id);
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
    await writeJson(recordPath(id), updated);
    return updated;
  }

  async remove(id: string, ownerKeyHash: string): Promise<void> {
    const existing = await this.getDraft(id);
    if (!existing) return;
    if (!constantTimeEqual(existing.ownerKeyHash, ownerKeyHash)) throw new Error("FORBIDDEN");
    await fs.rm(recordPath(id), { force: true });
    await fs.rm(path.join(INDEX, `token-${safeName(existing.accessToken)}.json`), {
      force: true,
    });
  }

  async listByOwner(ownerKeyHash: string): Promise<ApologyDraft[]> {
    const file = path.join(INDEX, `owner-${safeName(ownerKeyHash)}.json`);
    const ids = (await readJson<string[]>(file)) ?? [];
    const records = await Promise.all(ids.map((id) => this.getDraft(id)));
    return records
      .filter((r): r is ApologyRecord => Boolean(r))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toCreatorDraft);
  }

  async listExpired(nowIso: string, limit: number): Promise<ApologyRecord[]> {
    await ensureDirs();
    const entries = await fs.readdir(RECORDS);
    const now = Date.parse(nowIso);
    const expired: ApologyRecord[] = [];

    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const record = await readJson<ApologyRecord>(path.join(RECORDS, entry));
      if (!record) continue;
      if (record.status !== "published") continue;
      const expires = Date.parse(record.expiresAt ?? "");
      if (!Number.isFinite(expires) || expires > now) continue;
      expired.push(record);
      if (expired.length >= limit) break;
    }

    return expired;
  }

  async purge(id: string): Promise<void> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;

    const record = await this.getDraft(id);
    await fs.rm(recordPath(id), { force: true });

    if (!record) return;

    // Drop the token index entry so an old public URL cannot resolve to
    // anything after the record is gone.
    await fs.rm(path.join(INDEX, `token-${safeName(record.accessToken)}.json`), {
      force: true,
    });

    // And the owner index entry, so Manage stops listing a deleted letter.
    const ownerFile = path.join(INDEX, `owner-${safeName(record.ownerKeyHash)}.json`);
    const ids = (await readJson<string[]>(ownerFile)) ?? [];
    if (ids.includes(id)) {
      await writeJson(
        ownerFile,
        ids.filter((ownerId) => ownerId !== id),
      );
    }
  }

  async getPublishedByToken(token: string): Promise<PublishedApology | undefined> {
    const record = await this.getByToken(token);
    if (!record) return undefined;
    // Expired, revoked and never-published links are indistinguishable.
    if (!isLinkLive(record.status, record.expiresAt)) return undefined;
    return toPublished(record);
  }

  async getByToken(token: string): Promise<ApologyRecord | undefined> {
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return undefined;
    const entry = await readJson<{ id: string }>(
      path.join(INDEX, `token-${safeName(token)}.json`),
    );
    if (!entry) return undefined;
    return this.getDraft(entry.id);
  }
}
