import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { FileRepository } from "./file-repository";
import { toPublished } from "./types";

const OWNER = "owner-hash-a";
const OTHER = "owner-hash-b";

const payload = {
  recipientName: "Ananya",
  senderName: "Rohan",
  situation: "fight" as const,
  language: "en" as const,
  messages: {
    message1: "I said too much.",
    message2: "You matter.",
    message3: "I will do better.",
    personalNote: "Written at 2am.",
  },
  themeId: "romantic" as const,
  stickerPackId: "cats" as const,
  customization: {
    audio: { source: "default" as const, volume: 0.5 },
    photos: [],
    memoryStyle: "polaroid" as const,
  },
  linkDurationDays: 3,
};

describe("FileRepository", () => {
  let repo: FileRepository;

  beforeEach(async () => {
    repo = new FileRepository();
    const dir = path.join(process.cwd(), ".data", "apologies");
    await fs.rm(dir, { recursive: true, force: true });
  });

  afterEach(async () => {
    const dir = path.join(process.cwd(), ".data", "apologies");
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("creates a draft with a non-sequential token", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    expect(draft.accessToken.length).toBeGreaterThanOrEqual(20);
    expect(draft.accessToken).not.toBe(draft.id);
    expect(draft.status).toBe("draft");
  });

  it("keeps a draft invisible to the recipient until published", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    expect(await repo.getPublishedByToken(draft.accessToken)).toBeUndefined();
  });

  it("blocks another owner from saving", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await expect(repo.saveDraft(draft.id, OTHER, payload)).rejects.toThrow("FORBIDDEN");
  });

  it("blocks another owner from publishing", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await expect(repo.publish(draft.id, OTHER, 3)).rejects.toThrow("FORBIDDEN");
  });

  it("publishes and serves only the recipient-safe payload", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    const published = await repo.publish(draft.id, OWNER, 3);

    const letter = await repo.getPublishedByToken(published.accessToken);
    expect(letter).toBeDefined();
    expect(letter).not.toHaveProperty("accessToken");
    expect(letter).not.toHaveProperty("ownerKeyHash");
    expect(letter?.messages.message1).toBe("I said too much.");
  });

  it("stops serving a revoked letter", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    const published = await repo.publish(draft.id, OWNER, 3);
    await repo.revoke(draft.id, OWNER);

    expect(await repo.getPublishedByToken(published.accessToken)).toBeUndefined();
  });

  it("refuses to save a revoked draft", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.revoke(draft.id, OWNER);
    await expect(repo.saveDraft(draft.id, OWNER, payload)).rejects.toThrow("REVOKED");
  });

  it("rejects malformed ids and tokens without touching disk", async () => {
    expect(await repo.getDraft("../../etc/passwd")).toBeUndefined();
    expect(await repo.getPublishedByToken("<script>")).toBeUndefined();
  });

  it("lists only the owner's drafts", async () => {
    await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.createDraft(OTHER, { recipientName: "C", senderName: "D" });

    const mine = await repo.listByOwner(OWNER);
    expect(mine).toHaveLength(1);
    expect(mine[0].recipientName).toBe("A");
  });

  it("removes a draft for its owner", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.remove(draft.id, OWNER);
    expect(await repo.getDraft(draft.id)).toBeUndefined();
  });

  it("sets a 1–7 day expiry on publish", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);

    const before = Date.now();
    const published = await repo.publish(draft.id, OWNER, 3);

    expect(published.linkDurationDays).toBe(3);
    const expires = Date.parse(published.expiresAt ?? "");
    expect(Number.isFinite(expires)).toBe(true);
    const window = expires - before;
    expect(window).toBeGreaterThan(3 * 86_400_000 - 5_000);
    expect(window).toBeLessThan(3 * 86_400_000 + 5_000);
  });

  it("clamps an oversized window instead of producing a long-lived link", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    const published = await repo.publish(draft.id, OWNER, 99);

    expect(published.linkDurationDays).toBe(7);
    const days = (Date.parse(published.expiresAt ?? "") - Date.now()) / 86_400_000;
    expect(days).toBeLessThanOrEqual(7.01);
  });

  it("re-publishing renews the window and keeps the same token", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    const first = await repo.publish(draft.id, OWNER, 1);

    // Simulate the window passing.
    const file = path.join(process.cwd(), ".data", "apologies", `${draft.id}.json`);
    const stored = JSON.parse(await fs.readFile(file, "utf8"));
    stored.expiresAt = new Date(Date.now() - 60_000).toISOString();
    await fs.writeFile(file, JSON.stringify(stored));

    expect(await repo.getPublishedByToken(first.accessToken)).toBeUndefined();

    const renewed = await repo.publish(draft.id, OWNER, 5);
    expect(renewed.accessToken).toBe(first.accessToken);
    expect(Date.parse(renewed.expiresAt ?? "")).toBeGreaterThan(Date.now());
    expect(await repo.getPublishedByToken(first.accessToken)).toBeDefined();
  });

  it("stops serving a letter whose window has passed", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    const published = await repo.publish(draft.id, OWNER, 2);

    const file = path.join(process.cwd(), ".data", "apologies", `${draft.id}.json`);
    const stored = JSON.parse(await fs.readFile(file, "utf8"));
    stored.expiresAt = new Date(Date.now() - 1_000).toISOString();
    await fs.writeFile(file, JSON.stringify(stored));

    expect(await repo.getPublishedByToken(published.accessToken)).toBeUndefined();
  });

  it("honours the 1-day and 7-day ends of the window", async () => {
    for (const days of [1, 7]) {
      const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
      await repo.saveDraft(draft.id, OWNER, payload);
      const before = Date.now();
      const published = await repo.publish(draft.id, OWNER, days);
      const createdAt = Date.parse(published.expiresAt ?? "");
      const days_out = (createdAt - before) / 86_400_000;

      expect(published.linkDurationDays).toBe(days);
      expect(days_out).toBeGreaterThan(days - 0.01);
      expect(days_out).toBeLessThan(days + 0.01);
    }
  });

  it("lists only published records whose window has passed", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    await repo.publish(draft.id, OWNER, 1);

    const future = await repo.listExpired(new Date(Date.now() + 86_400_000).toISOString(), 10);
    expect(future.map((record) => record.id)).toContain(draft.id);

    const past = await repo.listExpired(new Date(Date.now() - 86_400_000).toISOString(), 10);
    expect(past.map((record) => record.id)).not.toContain(draft.id);
  });

  it("purge removes the record and stops the token resolving", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    const published = await repo.publish(draft.id, OWNER, 1);

    await repo.purge(draft.id);

    expect(await repo.getDraft(draft.id)).toBeUndefined();
    expect(await repo.getByToken(published.accessToken)).toBeUndefined();
    expect(await repo.listByOwner(OWNER)).toHaveLength(0);
  });

  it("refuses to renew once cleanup has started", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    const published = await repo.publish(draft.id, OWNER, 1);

    // Simulate the purge worker having claimed this apology.
    const dir = path.join(process.cwd(), ".data", "deletions");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${draft.id}.json`),
      JSON.stringify({
        apologyId: draft.id,
        assetIds: [],
        attempts: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        leaseUntil: Date.now() + 60_000,
      }),
    );

    await expect(repo.publish(draft.id, OWNER, 3)).rejects.toThrow("DELETED");

    // Access is still governed by expiry, not by the job.
    expect(await repo.getPublishedByToken(published.accessToken)).toBeDefined();

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("treats a published record with no expiry as dead and purgeable", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    const published = await repo.publish(draft.id, OWNER, 1);

    // Simulate a document written before expiry was mandatory.
    const file = path.join(process.cwd(), ".data", "apologies", `${draft.id}.json`);
    const stored = JSON.parse(await fs.readFile(file, "utf8"));
    delete stored.expiresAt;
    await fs.writeFile(file, JSON.stringify(stored));

    // Inaccessible immediately: missing expiry is never permanent access.
    expect(await repo.getPublishedByToken(published.accessToken)).toBeUndefined();

    // And visible to cleanup, so it does not linger forever.
    const candidates = await repo.listExpired(new Date().toISOString(), 10);
    expect(candidates.map((record) => record.id)).toContain(draft.id);
  });

  it("treats a malformed expiry as dead and purgeable", async () => {
    const draft = await repo.createDraft(OWNER, { recipientName: "A", senderName: "B" });
    await repo.saveDraft(draft.id, OWNER, payload);
    const published = await repo.publish(draft.id, OWNER, 1);

    const file = path.join(process.cwd(), ".data", "apologies", `${draft.id}.json`);
    const stored = JSON.parse(await fs.readFile(file, "utf8"));
    stored.expiresAt = "not-a-date";
    await fs.writeFile(file, JSON.stringify(stored));

    expect(await repo.getPublishedByToken(published.accessToken)).toBeUndefined();
    const candidates = await repo.listExpired(new Date().toISOString(), 10);
    expect(candidates.map((record) => record.id)).toContain(draft.id);
  });

  it("toPublished never leaks server fields", () => {
    const published = toPublished({
      id: "x",
      accessToken: "secret",
      ownerKeyHash: "hash",
      recipientName: "A",
      senderName: "B",
      situation: "fight",
      language: "en",
      messages: { message1: "a", message2: "b", message3: "c", personalNote: "" },
      themeId: "romantic",
      stickerPackId: "cats",
      customization: {
        audio: { source: "default", volume: 0.5 },
        photos: [],
        memoryStyle: "polaroid",
      },
      linkDurationDays: 3,
      status: "published",
      createdAt: "now",
      updatedAt: "now",
      publishedAt: "now",
    });
    expect(published).not.toHaveProperty("accessToken");
    expect(published).not.toHaveProperty("ownerKeyHash");
  });
});
