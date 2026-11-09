import type { ApologyDraft, ApologyRecord, PublishedApology } from "@/types/apology";
import type { DraftPayload } from "@/lib/validation/apology";
import type {
  ApologyRepository,
  AssetRecord,
  ReserveAssetInput,
  ServingAsset,
} from "@/lib/storage/types";
import type { LifecycleStore } from "@/lib/lifecycle/store";
import type {
  Candidate,
  DeletionJob,
  DeletionTombstone,
  PendingReservation,
} from "@/lib/lifecycle/types";
import { isLinkLive } from "@/lib/expiry";

/**
 * One in-memory state shared by a repository facade and a lifecycle facade,
 * so tests can interleave an upload with a deletion exactly as production
 * would. It mirrors the SQL invariants rather than a simplified model:
 *
 * - intent writes the job (unioning keys, never reopening `completed`) before
 *   flipping the status;
 * - `failed` assets do not count toward the cap;
 * - finalisation deletes assets, then the apology, then writes the tombstone.
 */
export interface FakeBackend {
  repository: ApologyRepository;
  lifecycle: LifecycleStore;
  state: {
    apologies: Map<string, ApologyRecord>;
    assets: Map<string, AssetRecord[]>;
    jobs: Map<string, DeletionJob>;
    tombstones: DeletionTombstone[];
  };
}

let counter = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;

export function makeRecord(patch: Partial<ApologyRecord> = {}): ApologyRecord {
  const now = new Date("2026-01-01T00:00:00.000Z").toISOString();
  return {
    id: patch.id ?? nextId(),
    accessToken: patch.accessToken ?? "token",
    ownerKeyHash: "owner-hash",
    recipientName: "Ananya",
    senderName: "Rohan",
    situation: "fight",
    situationCustom: "",
    language: "en",
    messages: { message1: "a", message2: "b", message3: "c", personalNote: "" },
    themeId: "romantic",
    stickerPackId: "cats",
    customization: {
      audio: { source: "none", volume: 0.5 },
      photos: [],
      memoryStyle: "polaroid",
    },
    linkDurationDays: 3,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

export function createFakeBackend(): FakeBackend {
  const apologies = new Map<string, ApologyRecord>();
  const assets = new Map<string, AssetRecord[]>();
  const jobs = new Map<string, DeletionJob>();
  const tombstones: DeletionTombstone[] = [];

  const listFor = (id: string) => assets.get(id) ?? [];
  const editable = (record: ApologyRecord | undefined) =>
    Boolean(record) && record!.status !== "deleted" && !jobs.has(record!.id);

  function intent(
    record: ApologyRecord,
    reason: "expired" | "manual",
  ): boolean {
    if (record.status === "deleted") return false;

    const existing = jobs.get(record.id);
    if (existing?.state === "completed") return false;

    const keys = new Set<string>(existing?.objectKeys ?? []);
    for (const asset of listFor(record.id)) keys.add(asset.objectKey);

    jobs.set(record.id, {
      apologyId: record.id,
      ownerKeyHash: record.ownerKeyHash,
      objectKeys: [...keys],
      state: "pending",
      reason: existing?.reason ?? reason,
      attemptCount: existing?.attemptCount ?? 0,
    });

    record.status = "deleted";
    record.expiresAt = undefined;
    return true;
  }

  const repository: ApologyRepository = {
    async createDraft(ownerKeyHash, seed) {
      const record = makeRecord({
        ownerKeyHash,
        recipientName: seed.recipientName,
        senderName: seed.senderName,
      });
      apologies.set(record.id, record);
      return record;
    },

    async getDraft(id) {
      return apologies.get(id);
    },

    async saveDraft(id, ownerKeyHash, payload: DraftPayload) {
      const record = apologies.get(id);
      if (!record) throw new Error("NOT_FOUND");
      if (record.ownerKeyHash !== ownerKeyHash) throw new Error("FORBIDDEN");
      if (!editable(record)) throw new Error("DELETED");
      Object.assign(record, payload, { updatedAt: new Date().toISOString() });
      return record;
    },

    async publish(id, ownerKeyHash, durationDays) {
      const record = apologies.get(id);
      if (!record) throw new Error("NOT_FOUND");
      if (record.ownerKeyHash !== ownerKeyHash) throw new Error("FORBIDDEN");
      if (record.status === "deleted") throw new Error("DELETED");
      if (jobs.has(id)) throw new Error("DELETED");

      record.status = "published";
      record.accessToken = `token-${nextId()}`;
      record.publishedAt = new Date().toISOString();
      record.expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString();
      record.linkDurationDays = durationDays;
      return record;
    },

    async revoke(id, ownerKeyHash) {
      const record = apologies.get(id);
      if (!record) throw new Error("NOT_FOUND");
      if (record.ownerKeyHash !== ownerKeyHash) throw new Error("FORBIDDEN");
      if (record.status !== "published") throw new Error("NOT_EDITABLE");
      record.status = "revoked";
      return record;
    },

    async remove(id, ownerKeyHash) {
      await repository.requestDeletionByOwner(id, ownerKeyHash);
    },

    async listByOwner(ownerKeyHash) {
      return [...apologies.values()]
        .filter((record) => record.ownerKeyHash === ownerKeyHash)
        .map<ApologyDraft>((record) => {
          const { accessToken: _t, ownerKeyHash: _o, ...draft } = record;
          void _t;
          void _o;
          return draft;
        });
    },

    async getByToken(token) {
      return [...apologies.values()].find((record) => record.accessToken === token);
    },

    async getPublishedByToken(token): Promise<PublishedApology | undefined> {
      const record = await repository.getByToken(token);
      if (!record || !isLinkLive(record.status, record.expiresAt)) return undefined;
      return {
        recipientName: record.recipientName,
        senderName: record.senderName,
        situation: record.situation,
        situationCustom: record.situationCustom,
        messages: record.messages,
        themeId: record.themeId,
        stickerPackId: record.stickerPackId,
        customization: record.customization,
        publishedAt: record.publishedAt ?? record.updatedAt,
      };
    },

    async reserveAsset(input: ReserveAssetInput) {
      const record = apologies.get(input.apologyId);
      if (!record || record.ownerKeyHash !== input.ownerKeyHash) return null;
      if (!editable(record)) return null;
      const live = listFor(record.id).filter((asset) => asset.state !== "failed");
      if (live.length >= input.maxAssets) return null;

      const asset: AssetRecord = {
        id: nextId(),
        apologyId: record.id,
        state: "pending",
        objectKey: input.objectKey,
        kind: input.kind,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        createdAt: new Date().toISOString(),
      };
      assets.set(record.id, [...listFor(record.id), asset]);
      return asset;
    },

    async completeAsset(assetId, apologyId, ownerKeyHash) {
      const record = apologies.get(apologyId);
      if (!record || record.ownerKeyHash !== ownerKeyHash) return null;
      if (!editable(record)) return null;

      const asset = listFor(apologyId).find(
        (candidate) => candidate.id === assetId && candidate.state === "pending",
      );
      if (!asset) return null;
      asset.state = "uploaded";
      return asset;
    },

    async failAsset(assetId) {
      for (const list of assets.values()) {
        const asset = list.find((candidate) => candidate.id === assetId);
        if (asset && asset.state === "pending") asset.state = "failed";
      }
    },

    async listAssets(apologyId) {
      return listFor(apologyId).filter((asset) => asset.state === "uploaded");
    },

    async getAssetForServing(assetId): Promise<ServingAsset | undefined> {
      for (const [apologyId, list] of assets) {
        const asset = list.find((candidate) => candidate.id === assetId);
        const record = apologies.get(apologyId);
        if (asset && record) {
          return {
            ...asset,
            ownerKeyHash: record.ownerKeyHash,
            apologyStatus: record.status,
            expiresAt: record.expiresAt ?? null,
          };
        }
      }
      return undefined;
    },

    async requestDeletionByOwner(id, ownerKeyHash) {
      const record = apologies.get(id);
      if (!record || record.ownerKeyHash !== ownerKeyHash) return false;
      return intent(record, "manual");
    },

    async isDeletionPending(apologyId) {
      return jobs.has(apologyId);
    },

    async tombstonesForOwner(ownerKeyHash) {
      return tombstones.filter((tomb) => tomb.ownerKeyHash === ownerKeyHash);
    },
  };

  const lifecycle: LifecycleStore = {
    async listCandidates(now, limit): Promise<Candidate[]> {
      const out: Candidate[] = [];
      for (const record of apologies.values()) {
        if (record.status !== "published") continue;
        if (!record.expiresAt) continue;
        if (Date.parse(record.expiresAt) > now.getTime()) continue;
        if (jobs.has(record.id)) continue;
        out.push({ apologyId: record.id, source: "expired" });
      }
      for (const job of jobs.values()) {
        if (job.state === "completed") continue;
        if (out.some((candidate) => candidate.apologyId === job.apologyId)) continue;
        out.push({ apologyId: job.apologyId, source: "job" });
      }
      return out.slice(0, limit);
    },

    async requestDeletionForExpiry(apologyId, now) {
      const record = apologies.get(apologyId);
      if (!record) return false;
      if (record.status !== "published") return false;
      if (!record.expiresAt || Date.parse(record.expiresAt) > now.getTime()) return false;
      return intent(record, "expired");
      void now;
    },

    async claim(apologyId, now, leaseMs) {
      const job = jobs.get(apologyId);
      if (!job || job.state === "completed") return null;
      if (job.leaseUntil && job.leaseUntil > now.getTime()) return null;
      job.state = "processing";
      job.attemptCount += 1;
      job.leaseUntil = now.getTime() + leaseMs;
      return { ...job };
    },

    async objectKeys(apologyId) {
      return listFor(apologyId).map((asset) => asset.objectKey);
    },

    async pendingReservations(apologyId): Promise<PendingReservation[]> {
      return listFor(apologyId)
        .filter((asset) => asset.state === "pending")
        .map((asset) => ({
          id: asset.id,
          objectKey: asset.objectKey,
          createdAt: new Date(asset.createdAt),
        }));
    },

    async abandonReservations(ids) {
      for (const list of assets.values()) {
        for (const asset of list) {
          if (ids.includes(asset.id)) asset.state = "failed";
        }
      }
    },

    async finalize(job, assetsDeleted, now) {
      assets.delete(job.apologyId);
      apologies.delete(job.apologyId);
      if (job.ownerKeyHash) {
        tombstones.push({
          apologyId: job.apologyId,
          ownerKeyHash: job.ownerKeyHash,
          deletedAt: now.toISOString(),
          assetsDeleted,
          reason: job.reason,
        });
      }
      jobs.set(job.apologyId, {
        ...job,
        state: "completed",
        leaseUntil: undefined,
        lastError: undefined,
      });
    },

    async fail(job, error, now) {
      const existing = jobs.get(job.apologyId) ?? job;
      jobs.set(job.apologyId, {
        ...existing,
        state: "failed",
        leaseUntil: undefined,
        lastError: error,
        attemptCount: existing.attemptCount,
      });
      void now;
    },

    async defer(job, reason) {
      const existing = jobs.get(job.apologyId) ?? job;
      jobs.set(job.apologyId, {
        ...existing,
        state: "pending",
        leaseUntil: undefined,
        lastError: reason,
      });
    },
  };

  return { repository, lifecycle, state: { apologies, assets, jobs, tombstones } };
}
