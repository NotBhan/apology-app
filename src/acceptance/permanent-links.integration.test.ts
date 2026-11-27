import { beforeEach, describe, expect, it } from "vitest";
import { createFakeBackend, makeRecord, type FakeBackend } from "@/test/adapters/fake-backend";
import { canServeAsset } from "@/lib/storage/asset-access";
import { isLinkLive, isResponseLive } from "@/lib/expiry";
import { runCleanup } from "@/lib/lifecycle/protocol";
import { createFakeObjectStore } from "@/test/adapters/fake-object-store";
import type { AssetRecord } from "@/lib/storage/types";

/**
 * Permanent-publication regression coverage.
 *
 * These cases exist because a published "I Miss You" link was reported as
 * unusable immediately after it was sent. The link must not depend on any
 * elapsed time, and only explicit author action may take it out of service.
 */

const OWNER = "owner-hash";
const OTHER_OWNER = "someone-else";

const MISS_YOU_CONTENT = {
  recipientName: "Maya",
  senderName: "Kabir",
  headline: "Counting hours",
  distanceNote: "Three timezones",
  letter: "See you on Friday evening.",
  reminders: [],
  themeId: "dusk-postage",
  photoLayout: "postcards",
  photos: [],
  audio: "none",
};

describe("published links are permanent", () => {
  let backend: FakeBackend;

  beforeEach(() => {
    backend = createFakeBackend();
  });

  async function publishedMissYou(): Promise<{ id: string; token: string }> {
    const draft = await backend.repository.createDraft(
      { userId: "u-1", scopeKey: OWNER },
      { recipientName: "Maya", senderName: "Kabir" },
      { experienceType: "miss-you", content: MISS_YOU_CONTENT },
    );
    const published = await backend.repository.publish(draft.id, OWNER);
    return { id: draft.id, token: published.accessToken };
  }

  it("1. a newly published I Miss You link is accessible with no creator session", async () => {
    const { token } = await publishedMissYou();

    // No owner key, no cookie, no session: exactly what a recipient has.
    const view = await backend.repository.getPublishedByToken(token);

    expect(view).toBeDefined();
    expect(view?.experienceType).toBe("miss-you");
    expect(view?.content).toEqual(MISS_YOU_CONTENT);
  });

  it("2. publication writes no expiry, so validity cannot depend on a seven-day window", async () => {
    const { id } = await publishedMissYou();
    const record = await backend.repository.getDraft(id);

    expect(record?.status).toBe("published");
    expect(record?.expiresAt).toBeUndefined();
    // The literal bug that was reported: isLinkLive must not treat "no expiry"
    // as dead.
    expect(isLinkLive(record?.status)).toBe(true);
  });

  it("3. a valid link still works after simulated elapsed time", async () => {
    const { token } = await publishedMissYou();

    // Ten years later, with the cleanup worker running at that future instant.
    const objects = createFakeObjectStore();
    const tenYears = 10 * 365 * 86_400_000;
    const report = await runCleanup({
      store: backend.lifecycle,
      objects,
      now: () => new Date(Date.now() + tenYears),
    });

    expect(report.deleted).toBe(0);
    expect(await backend.repository.getPublishedByToken(token)).toBeDefined();
  });

  it("4. explicit revocation invalidates the link immediately", async () => {
    const { id, token } = await publishedMissYou();
    expect(await backend.repository.getPublishedByToken(token)).toBeDefined();

    await backend.repository.revoke(id, OWNER);

    expect(await backend.repository.getPublishedByToken(token)).toBeUndefined();
    expect(isLinkLive((await backend.repository.getDraft(id))?.status)).toBe(false);
  });

  it("5. explicit deletion invalidates the link and follows the deletion lifecycle", async () => {
    const { id, token } = await publishedMissYou();
    const objects = createFakeObjectStore();

    const queued = await backend.repository.requestDeletionByOwner(id, OWNER);
    expect(queued).toBe(true);

    // Access stops at intent time, before any physical removal.
    expect(await backend.repository.getPublishedByToken(token)).toBeUndefined();

    const job = backend.state.jobs.get(id);
    expect(job?.reason).toBe("manual");
    expect(job?.state).toBe("pending");

    const report = await runCleanup({ store: backend.lifecycle, objects });
    expect(report.deleted).toBe(1);
    expect(backend.state.apologies.has(id)).toBe(false);
    expect(backend.state.tombstones[0]).toMatchObject({ apologyId: id, reason: "manual" });
  });

  it("6. an unpublished draft is never reachable by any token", async () => {
    const draft = await backend.repository.createDraft(
      { userId: "u-1", scopeKey: OWNER },
      { recipientName: "Maya", senderName: "Kabir" },
      { experienceType: "miss-you", content: MISS_YOU_CONTENT },
    );

    expect(await backend.repository.getPublishedByToken(draft.accessToken)).toBeUndefined();
    expect(await backend.repository.getPublishedByToken("tok-" + draft.id)).toBeUndefined();
    expect(await backend.repository.getPublishedByToken("not-a-real-token")).toBeUndefined();
  });

  it("7. an unauthorized viewer cannot read another creator's unpublished assets", async () => {
    const draft = await backend.repository.createDraft(
      { userId: "u-1", scopeKey: OWNER },
      { recipientName: "Maya", senderName: "Kabir" },
      { experienceType: "miss-you", content: MISS_YOU_CONTENT },
    );
    const asset: AssetRecord = {
      id: "00000000-0000-4000-8000-000000000123",
      apologyId: draft.id,
      state: "uploaded",
      objectKey: "apologies/x/photo.webp",
      kind: "photo",
      contentType: "image/webp",
      sizeBytes: 100,
      createdAt: new Date().toISOString(),
    };
    backend.state.assets.set(draft.id, [asset]);

    const serving = await backend.repository.getAssetForServing(asset.id);
    expect(serving).toBeDefined();

    // A stranger gets nothing from a draft.
    expect(canServeAsset({ asset: serving!, ownerKeyHash: OTHER_OWNER })).toBe(false);
    // Nor does an anonymous recipient.
    expect(canServeAsset({ asset: serving! })).toBe(false);
    // The owner still can.
    expect(canServeAsset({ asset: serving!, ownerKeyHash: OWNER })).toBe(true);
  });

  it("8. published recipient photographs stay readable without signing in", async () => {
    const { id } = await publishedMissYou();
    const asset: AssetRecord = {
      id: "00000000-0000-4000-8000-000000000456",
      apologyId: id,
      state: "uploaded",
      objectKey: "apologies/x/published-photo.webp",
      kind: "photo",
      contentType: "image/webp",
      sizeBytes: 100,
      createdAt: new Date().toISOString(),
    };
    backend.state.assets.set(id, [asset]);

    const serving = await backend.repository.getAssetForServing(asset.id);
    expect(serving).toBeDefined();
    expect(canServeAsset({ asset: serving! })).toBe(true);
  });

  it("9. re-publishing a live link keeps the token the recipient already has", async () => {
    const { id, token } = await publishedMissYou();

    // This is what Share / Renew / Preview do on an already-live record.
    const republished = await backend.repository.publish(id, OWNER);

    expect(token).toBeTruthy();
    expect(await backend.repository.getPublishedByToken(token)).toBeDefined();
    // No new plaintext token is handed out, because none was minted.
    expect(republished.accessToken).toBe(token);
  });

  it("10. a revoked record gets a fresh token, so the dead link stays dead", async () => {
    const { id, token } = await publishedMissYou();
    await backend.repository.revoke(id, OWNER);

    const republished = await backend.repository.publish(id, OWNER);

    expect(republished.accessToken).not.toBe(token);
    expect(await backend.repository.getPublishedByToken(token)).toBeUndefined();
    expect(await backend.repository.getPublishedByToken(republished.accessToken)).toBeDefined();
  });

  it("11. a response link dies with its parent, not with time", async () => {
    const { id } = await publishedMissYou();

    expect(isResponseLive("published", "published")).toBe(true);

    await backend.repository.revoke(id, OWNER);
    const parentStatus = (await backend.repository.getDraft(id))?.status;
    expect(isResponseLive("published", parentStatus)).toBe(false);
  });

  it("12. an apology publication is permanent on the same terms", async () => {
    // The `apology` module shares the platform, so the invariant must hold there too.
    const draft = await backend.repository.createDraft(
      { userId: "u-1", scopeKey: OWNER },
      { recipientName: "Riya", senderName: "Aarav" },
    );
    const published = await backend.repository.publish(draft.id, OWNER);

    const tenYears = 10 * 365 * 86_400_000;
    await runCleanup({
      store: backend.lifecycle,
      objects: createFakeObjectStore(),
      now: () => new Date(Date.now() + tenYears),
    });

    const view = await backend.repository.getPublishedByToken(published.accessToken);
    expect(view).toBeDefined();
    expect(view?.recipientName).toBe("Riya");
  });

  it("13. a birthday publication is permanent on the same terms", async () => {
    const draft = await backend.repository.createDraft(
      { userId: "u-1", scopeKey: OWNER },
      { recipientName: "Meera", senderName: "Kabir" },
      {
        experienceType: "birthday",
        content: {
          recipientName: "Meera",
          senderName: "Kabir",
          headline: "Happy birthday",
          message: "Have a wonderful day!",
          themeId: "confetti",
        },
      },
    );
    const published = await backend.repository.publish(draft.id, OWNER);

    const view = await backend.repository.getPublishedByToken(published.accessToken);
    expect(view?.experienceType).toBe("birthday");
    expect(view).toBeDefined();
  });

  it("14. a legacy row carrying a past expiresAt is still live", async () => {
    // Rows written before permanent links existed may still carry a timestamp.
    // Status, not the timestamp, decides access.
    const legacy = makeRecord({
      ownerKeyHash: OWNER,
      status: "published",
      expiresAt: new Date("2020-01-01T00:00:00.000Z").toISOString(),
    });
    backend.state.apologies.set(legacy.id, legacy);

    expect(isLinkLive(legacy.status)).toBe(true);
    expect(await backend.repository.getPublishedByToken(legacy.accessToken)).toBeDefined();
  });

  it("15. the cleanup worker never selects a live record, even with explicit expiry data", async () => {
    const legacy = makeRecord({
      ownerKeyHash: OWNER,
      status: "published",
      expiresAt: new Date("2020-01-01T00:00:00.000Z").toISOString(),
    });
    backend.state.apologies.set(legacy.id, legacy);

    const report = await runCleanup({
      store: backend.lifecycle,
      objects: createFakeObjectStore(),
      now: () => new Date("2030-01-01T00:00:00.000Z"),
    });

    expect(report.scanned).toBe(0);
    expect(backend.state.apologies.has(legacy.id)).toBe(true);
  });
});
