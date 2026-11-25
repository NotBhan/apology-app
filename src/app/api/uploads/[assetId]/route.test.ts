import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/security/creator", () => ({
  getCreator: vi.fn(),
  requireApiCreator: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getRepository: vi.fn(),
  getObjectStore: vi.fn(),
}));

vi.mock("@/lib/security/postgres-rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, reset: 60 }),
  rateLimitHeaders: vi.fn().mockReturnValue({ "X-RateLimit-Remaining": "10" }),
}));

import { getCreator, requireApiCreator } from "@/lib/security/creator";
import { getObjectStore, getRepository } from "@/lib/storage";
import { DELETE, GET } from "./route";

const VALID_ID = "11111111-2222-3333-4444-555555555555";
const MALFORMED_36_CHAR_ID = "not-a-uuid-1234-1234-1234-123456789z";

describe("/api/uploads/[assetId] security", () => {
  const mockRepo = {
    getAssetForServing: vi.fn(),
    removeAsset: vi.fn(),
  };
  const mockObjects = {
    presignGet: vi.fn().mockResolvedValue("https://signed.example/obj"),
    deleteMany: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepository).mockReturnValue(mockRepo as never);
    vi.mocked(getObjectStore).mockReturnValue(mockObjects as never);
    vi.mocked(getCreator).mockResolvedValue(undefined);
  });

  it("returns 404 on GET for malformed 36-char non-UUID asset ids without querying storage", async () => {
    const res = await GET(new Request("https://app.test/api/uploads/" + MALFORMED_36_CHAR_ID), {
      params: Promise.resolve({ assetId: MALFORMED_36_CHAR_ID }),
    });
    expect(res.status).toBe(404);
    expect(mockRepo.getAssetForServing).not.toHaveBeenCalled();
  });

  it("blocks owner GET when the owning apology is deleted", async () => {
    vi.mocked(getCreator).mockResolvedValue({
      userId: "user-1",
      key: "owner-hash",
    });
    mockRepo.getAssetForServing.mockResolvedValue({
      id: VALID_ID,
      apologyId: "apology-1",
      state: "uploaded",
      objectKey: "k1",
      kind: "photo",
      contentType: "image/webp",
      sizeBytes: 1000,
      createdAt: new Date().toISOString(),
      ownerKeyHash: "owner-hash",
      apologyStatus: "deleted",
      expiresAt: null,
    });

    const res = await GET(new Request("https://app.test/api/uploads/" + VALID_ID), {
      params: Promise.resolve({ assetId: VALID_ID }),
    });
    expect(res.status).toBe(404);
    expect(mockObjects.presignGet).not.toHaveBeenCalled();
  });

  it("returns 403 on DELETE when caller does not own the asset", async () => {
    vi.mocked(requireApiCreator).mockResolvedValue({
      ok: true,
      creator: { userId: "user-2", key: "stranger-hash" },
    });
    mockRepo.getAssetForServing.mockResolvedValue({
      id: VALID_ID,
      apologyId: "apology-1",
      state: "uploaded",
      objectKey: "k1",
      kind: "photo",
      contentType: "image/webp",
      sizeBytes: 1000,
      createdAt: new Date().toISOString(),
      ownerKeyHash: "owner-hash",
      apologyStatus: "draft",
      expiresAt: null,
    });

    const res = await DELETE(
      new Request("https://app.test/api/uploads/" + VALID_ID, { method: "DELETE" }),
      { params: Promise.resolve({ assetId: VALID_ID }) },
    );
    expect(res.status).toBe(403);
    expect(mockObjects.deleteMany).not.toHaveBeenCalled();
    expect(mockRepo.removeAsset).not.toHaveBeenCalled();
  });

  it("returns 502 and leaves asset intact if object deletion fails", async () => {
    vi.mocked(requireApiCreator).mockResolvedValue({
      ok: true,
      creator: { userId: "user-1", key: "owner-hash" },
    });
    mockRepo.getAssetForServing.mockResolvedValue({
      id: VALID_ID,
      apologyId: "apology-1",
      state: "uploaded",
      objectKey: "k1",
      kind: "photo",
      contentType: "image/webp",
      sizeBytes: 1000,
      createdAt: new Date().toISOString(),
      ownerKeyHash: "owner-hash",
      apologyStatus: "draft",
      expiresAt: null,
    });
    mockObjects.deleteMany.mockResolvedValue({ deleted: [], failed: [{ key: "k1", error: "503" }] });

    const res = await DELETE(
      new Request("https://app.test/api/uploads/" + VALID_ID, { method: "DELETE" }),
      { params: Promise.resolve({ assetId: VALID_ID }) },
    );
    expect(res.status).toBe(502);
    expect(mockRepo.removeAsset).not.toHaveBeenCalled();
  });

  it("deletes object and calls removeAsset on authorized owner DELETE", async () => {
    vi.mocked(requireApiCreator).mockResolvedValue({
      ok: true,
      creator: { userId: "user-1", key: "owner-hash" },
    });
    mockRepo.getAssetForServing.mockResolvedValue({
      id: VALID_ID,
      apologyId: "apology-1",
      state: "uploaded",
      objectKey: "k1",
      kind: "photo",
      contentType: "image/webp",
      sizeBytes: 1000,
      createdAt: new Date().toISOString(),
      ownerKeyHash: "owner-hash",
      apologyStatus: "draft",
      expiresAt: null,
    });
    mockObjects.deleteMany.mockResolvedValue({ deleted: ["k1"], failed: [] });
    mockRepo.removeAsset.mockResolvedValue(true);

    const res = await DELETE(
      new Request("https://app.test/api/uploads/" + VALID_ID, { method: "DELETE" }),
      { params: Promise.resolve({ assetId: VALID_ID }) },
    );
    expect(res.status).toBe(200);
    expect(mockObjects.deleteMany).toHaveBeenCalledWith(["k1"]);
    expect(mockRepo.removeAsset).toHaveBeenCalledWith(VALID_ID, "owner-hash");
  });
});
