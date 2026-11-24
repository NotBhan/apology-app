import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock creator authentication
vi.mock("@/lib/security/creator", () => ({
  requireApiCreator: vi.fn(),
  getCreator: vi.fn(),
}));

// Mock rate limiting to be configurable per test
const mockEnforceRateLimit = vi.fn().mockResolvedValue({ allowed: true, remaining: 10, reset: 60 });
vi.mock("@/lib/security/postgres-rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  rateLimitHeaders: vi.fn().mockReturnValue({ "X-RateLimit-Remaining": "10" }),
}));

// Mock storage repositories
vi.mock("@/lib/storage", () => ({
  getResponseRepository: vi.fn(),
  getObjectStore: vi.fn(),
}));

import { requireApiCreator, getCreator } from "@/lib/security/creator";
import { getObjectStore, getResponseRepository } from "@/lib/storage";
import type { ResponseRepository } from "@/lib/storage/response-repository";
import type { ObjectStore } from "@/lib/storage/object-store";
import { hashResponseToken } from "@/lib/id";
import { jsonError } from "@/lib/api/responses";

// Route handlers
import { GET as getPublicResponse } from "./[token]/route";
import { GET as getManageResponse, POST as postManageResponse } from "./manage/route";
import { GET as getResponseAsset } from "./assets/[assetId]/route";
import { POST as quickReplyHandler } from "../experiences/[experienceId]/responses/quick/route";
import { POST as experienceReplyHandler } from "../experiences/[experienceId]/responses/experience/route";
import { GET as listCreatorResponses } from "../experiences/[experienceId]/responses/route";
import { POST as uploadResponseAsset } from "./upload/route";

describe("API Authorization & Security Route Suite", () => {
  let mockRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockObjects: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockResolvedValue({ allowed: true, remaining: 10, reset: 60 });

    mockRepo = {
      getByPublicToken: vi.fn(),
      getByManageToken: vi.fn(),
      getDraft: vi.fn(),
      createDraft: vi.fn(),
      publishResponse: vi.fn(),
      revokeResponse: vi.fn(),
      restoreResponse: vi.fn(),
      deleteResponse: vi.fn(),
      listResponsesForApology: vi.fn(),
      getAssetForServing: vi.fn(),
      reserveResponseAsset: vi.fn(),
      promoteResponseAsset: vi.fn(),
      failAsset: vi.fn(),
    };

    mockObjects = {
      presignGet: vi.fn().mockResolvedValue("https://s3.filebase.com/presigned-url-123"),
      put: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getResponseRepository).mockReturnValue(mockRepo as unknown as ResponseRepository);
    vi.mocked(getObjectStore).mockReturnValue(mockObjects as unknown as ObjectStore);
  });

  /* -------------------------------------------------------------------------- */
  /* 1. Invalid & malformed tokens                                              */
  /* -------------------------------------------------------------------------- */
  describe("Invalid and malformed tokens", () => {
    it("rejects token that is too short (< 10 chars) with 404", async () => {
      const req = new Request("http://localhost/api/responses/tiny");
      const res = await getPublicResponse(req, { params: Promise.resolve({ token: "tiny" }) });
      expect(res.status).toBe(404);
      expect(mockRepo.getByPublicToken).not.toHaveBeenCalled();
    });

    it("rejects token with illegal characters with 404", async () => {
      const req = new Request("http://localhost/api/responses/invalid!token@chars#12345");
      const res = await getPublicResponse(req, {
        params: Promise.resolve({ token: "invalid!token@chars#12345" }),
      });
      expect(res.status).toBe(404);
      expect(mockRepo.getByPublicToken).not.toHaveBeenCalled();
    });

    it("rejects malformed manageToken in Authorization header with 401", async () => {
      const req = new Request("http://localhost/api/responses/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer bad-token!",
        },
        body: JSON.stringify({ action: "revoke" }),
      });
      const res = await postManageResponse(req);
      expect(res.status).toBe(401);
      expect(mockRepo.revokeResponse).not.toHaveBeenCalled();
    });

    it("rejects non-UUID asset IDs with 404", async () => {
      const req = new Request("http://localhost/api/responses/assets/not-a-uuid");
      const res = await getResponseAsset(req, {
        params: Promise.resolve({ assetId: "not-a-uuid" }),
      });
      expect(res.status).toBe(404);
      expect(mockRepo.getAssetForServing).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Revoked and deleted responses                                           */
  /* -------------------------------------------------------------------------- */
  describe("Revoked and deleted responses", () => {
    it("returns 404 when getByPublicToken returns null (revoked/deleted)", async () => {
      mockRepo.getByPublicToken.mockResolvedValue(null);
      const req = new Request("http://localhost/api/responses/valid-token-length-123");
      const res = await getPublicResponse(req, {
        params: Promise.resolve({ token: "valid-token-length-123" }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/could not find that response/i);
    });

    it("returns 409 when attempting to revoke an already deleted or invalid state response", async () => {
      mockRepo.getByManageToken.mockResolvedValue({ status: "revoked" });
      const req = new Request("http://localhost/api/responses/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-manage-token-123",
        },
        body: JSON.stringify({ action: "revoke" }),
      });
      const res = await postManageResponse(req);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/cannot transition/i);
    });

    it("returns 404 when looking up management record for deleted response", async () => {
      mockRepo.getByManageToken.mockResolvedValue(null);
      const req = new Request("http://localhost/api/responses/manage", {
        headers: {
          Authorization: "Bearer valid-manage-token-123",
        },
      });
      const res = await getManageResponse(req);
      expect(res.status).toBe(404);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Revoked and deleted parent experiences                                  */
  /* -------------------------------------------------------------------------- */
  describe("Revoked and deleted parent experiences", () => {
    it("rejects creating a quick reply when parent experience is not accessible", async () => {
      mockRepo.createDraft.mockRejectedValue(new Error("PARENT_NOT_ACCESSIBLE"));
      const req = new Request("http://localhost/api/experiences/p1/responses/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello there" }),
      });
      const res = await quickReplyHandler(req, {
        params: Promise.resolve({ experienceId: "11111111-2222-3333-4444-555555555555" }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/no longer accessible/i);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. Unauthorized management actions                                         */
  /* -------------------------------------------------------------------------- */
  describe("Unauthorized management actions", () => {
    it("rejects unknown actions with 400", async () => {
      const req = new Request("http://localhost/api/responses/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-manage-token-123",
        },
        body: JSON.stringify({ action: "unsupported_action" }),
      });
      const res = await postManageResponse(req);
      expect(res.status).toBe(400);
      expect(mockRepo.revokeResponse).not.toHaveBeenCalled();
      expect(mockRepo.deleteResponse).not.toHaveBeenCalled();
    });

    it("header-based manage endpoint rejects request when Authorization header is missing with 401", async () => {
      const req = new Request("http://localhost/api/responses/manage", {
        method: "GET",
      });
      const res = await getManageResponse(req);
      expect(res.status).toBe(401);
      expect(mockRepo.getByManageToken).not.toHaveBeenCalled();
    });

    it("header-based manage endpoint retrieves response details via Authorization: Bearer header", async () => {
      mockRepo.getByManageToken.mockResolvedValue({
        id: "resp-header-123",
        status: "published",
        content: { message: "Secret header reply" },
        createdAt: "2026-05-01T00:00:00.000Z",
      });
      const req = new Request("http://localhost/api/responses/manage", {
        method: "GET",
        headers: {
          Authorization: "Bearer secret-manage-token-header-9999",
        },
      });
      const res = await getManageResponse(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("resp-header-123");
      expect(mockRepo.getByManageToken).toHaveBeenCalledWith("secret-manage-token-header-9999");
    });

    it("header-based manage endpoint executes revoke action with zero tokens in URL", async () => {
      mockRepo.getByManageToken.mockResolvedValue({ status: "published" });
      mockRepo.revokeResponse.mockResolvedValue({ status: "revoked" });
      const req = new Request("http://localhost/api/responses/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer header-token-no-url-exposure",
        },
        body: JSON.stringify({ action: "revoke" }),
      });
      const res = await postManageResponse(req);
      expect(res.status).toBe(200);
      expect(mockRepo.revokeResponse).toHaveBeenCalledWith("header-token-no-url-exposure");
    });

    it("header-based manage endpoint executes delete action with zero tokens in URL", async () => {
      mockRepo.getByManageToken.mockResolvedValue({ status: "published" });
      mockRepo.deleteResponse.mockResolvedValue(true);
      const req = new Request("http://localhost/api/responses/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer header-token-delete-action",
        },
        body: JSON.stringify({ action: "delete" }),
      });
      const res = await postManageResponse(req);
      expect(res.status).toBe(200);
      expect(mockRepo.deleteResponse).toHaveBeenCalledWith("header-token-delete-action");
    });

    it("strictly isolates capabilities: rejects a public token attempting management actions with 404", async () => {
      mockRepo.getByManageToken.mockResolvedValue(null);
      const publicBearerToken = "pub-bearer-token-attempting-manage";
      const req = new Request("http://localhost/api/responses/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicBearerToken}`,
        },
        body: JSON.stringify({ action: "revoke" }),
      });
      const res = await postManageResponse(req);
      expect(res.status).toBe(404);
      expect(mockRepo.getByManageToken).toHaveBeenCalledWith(publicBearerToken);
      expect(mockRepo.revokeResponse).not.toHaveBeenCalled();
    });

    it("strictly isolates capabilities: rejects a management token attempting public-view route with 404", async () => {
      mockRepo.getByPublicToken.mockResolvedValue(null);
      const manageToken = "mgmt-token-attempting-public-route";
      const req = new Request(`http://localhost/api/responses/${manageToken}`);
      const res = await getPublicResponse(req, {
        params: Promise.resolve({ token: manageToken }),
      });
      expect(res.status).toBe(404);
      expect(mockRepo.getByPublicToken).toHaveBeenCalledWith(manageToken);
    });

    it("strictly isolates capabilities: rejects parent experience link token attempting to manage child response with 404", async () => {
      mockRepo.getByManageToken.mockResolvedValue(null);
      const parentLinkToken = "parent-link-token-cannot-manage-child";
      const req = new Request("http://localhost/api/responses/manage", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${parentLinkToken}`,
        },
      });
      const res = await getManageResponse(req);
      expect(res.status).toBe(404);
      expect(mockRepo.getByManageToken).toHaveBeenCalledWith(parentLinkToken);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. Cross-response media access audit                                       */
  /* -------------------------------------------------------------------------- */
  describe("Media Access and Capability Audit", () => {
    const validPublicToken = "pub-token-response-A-12345";
    const validManageToken = "man-token-response-A-12345";
    const otherPublicToken = "pub-token-response-B-99999";
    const parentOwnerKeyHash = "creator-hash-owner-A";

    const liveAsset = {
      id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      responseId: "resp-A",
      state: "uploaded",
      objectKey: "responses/resp-A/pic.jpg",
      responseStatus: "published",
      apologyStatus: "published",
      publicTokenHash: hashResponseToken(validPublicToken),
      manageTokenHash: hashResponseToken(validManageToken),
      parentOwnerKeyHash,
    };

    it("authorizes asset access with response A's public token", async () => {
      mockRepo.getAssetForServing.mockResolvedValue(liveAsset);
      vi.mocked(getCreator).mockResolvedValue(undefined);

      const req = new Request(
        `http://localhost/api/responses/assets/${liveAsset.id}?token=${validPublicToken}`,
      );
      const res = await getResponseAsset(req, {
        params: Promise.resolve({ assetId: liveAsset.id }),
      });

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("https://s3.filebase.com/presigned-url-123");
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
      // Explicit invariant verification: media URL expiration is strictly 60 seconds
      expect(mockObjects.presignGet).toHaveBeenCalledWith(liveAsset.objectKey, 60);
    });

    it("authorizes asset access with response A's management token", async () => {
      mockRepo.getAssetForServing.mockResolvedValue(liveAsset);
      vi.mocked(getCreator).mockResolvedValue(undefined);

      const req = new Request(
        `http://localhost/api/responses/assets/${liveAsset.id}?token=${validManageToken}`,
      );
      const res = await getResponseAsset(req, {
        params: Promise.resolve({ assetId: liveAsset.id }),
      });

      expect(res.status).toBe(307);
      expect(mockObjects.presignGet).toHaveBeenCalledWith(liveAsset.objectKey, 60);
    });

    it("rejects cross-response media access when providing response B's token", async () => {
      mockRepo.getAssetForServing.mockResolvedValue(liveAsset);
      vi.mocked(getCreator).mockResolvedValue(undefined);

      const req = new Request(
        `http://localhost/api/responses/assets/${liveAsset.id}?token=${otherPublicToken}`,
      );
      const res = await getResponseAsset(req, {
        params: Promise.resolve({ assetId: liveAsset.id }),
      });

      expect(res.status).toBe(404);
      expect(mockObjects.presignGet).not.toHaveBeenCalled();
    });

    it("rejects media access when called anonymously with no token", async () => {
      mockRepo.getAssetForServing.mockResolvedValue(liveAsset);
      vi.mocked(getCreator).mockResolvedValue(undefined);

      const req = new Request(`http://localhost/api/responses/assets/${liveAsset.id}`);
      const res = await getResponseAsset(req, {
        params: Promise.resolve({ assetId: liveAsset.id }),
      });

      expect(res.status).toBe(404);
    });

    it("immediately blocks media access if response status is revoked", async () => {
      mockRepo.getAssetForServing.mockResolvedValue({
        ...liveAsset,
        responseStatus: "revoked",
      });

      const req = new Request(
        `http://localhost/api/responses/assets/${liveAsset.id}?token=${validPublicToken}`,
      );
      const res = await getResponseAsset(req, {
        params: Promise.resolve({ assetId: liveAsset.id }),
      });

      expect(res.status).toBe(404);
      expect(mockObjects.presignGet).not.toHaveBeenCalled();
    });

    it("immediately blocks child response media access if parent experience is revoked", async () => {
      mockRepo.getAssetForServing.mockResolvedValue({
        ...liveAsset,
        apologyStatus: "revoked",
      });

      const req = new Request(
        `http://localhost/api/responses/assets/${liveAsset.id}?token=${validPublicToken}`,
      );
      const res = await getResponseAsset(req, {
        params: Promise.resolve({ assetId: liveAsset.id }),
      });

      expect(res.status).toBe(404);
      expect(mockObjects.presignGet).not.toHaveBeenCalled();
    });

    it("authorizes media access for the parent letter's creator without needing a token", async () => {
      mockRepo.getAssetForServing.mockResolvedValue(liveAsset);
      vi.mocked(getCreator).mockResolvedValue({
        userId: "creator-1",
        key: parentOwnerKeyHash,
      });

      const req = new Request(`http://localhost/api/responses/assets/${liveAsset.id}`);
      const res = await getResponseAsset(req, {
        params: Promise.resolve({ assetId: liveAsset.id }),
      });

      expect(res.status).toBe(307);
    });

    it("rejects media access for a creator who owns a different letter", async () => {
      mockRepo.getAssetForServing.mockResolvedValue(liveAsset);
      vi.mocked(getCreator).mockResolvedValue({
        userId: "creator-2",
        key: "different-owner-key-hash",
      });

      const req = new Request(`http://localhost/api/responses/assets/${liveAsset.id}`);
      const res = await getResponseAsset(req, {
        params: Promise.resolve({ assetId: liveAsset.id }),
      });

      expect(res.status).toBe(404);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 6. Creator-only access to incoming responses                               */
  /* -------------------------------------------------------------------------- */
  describe("Creator-only access to incoming responses", () => {
    it("returns 401 when creator session is absent", async () => {
      vi.mocked(requireApiCreator).mockResolvedValue({
        ok: false,
        response: jsonError(401, "Sign-in required"),
      } as unknown as Awaited<ReturnType<typeof requireApiCreator>>);

      const req = new Request("http://localhost/api/experiences/11111111-2222-3333-4444-555555555555/responses");
      const res = await listCreatorResponses(req, {
        params: Promise.resolve({ experienceId: "11111111-2222-3333-4444-555555555555" }),
      });

      expect(res.status).toBe(401);
      expect(mockRepo.listResponsesForApology).not.toHaveBeenCalled();
    });

    it("returns list of responses when creator session is valid", async () => {
      vi.mocked(requireApiCreator).mockResolvedValue({
        ok: true,
        creator: { userId: "user-1", key: "creator-scope-key" },
      } as unknown as Awaited<ReturnType<typeof requireApiCreator>>);

      mockRepo.listResponsesForApology.mockResolvedValue([
        {
          id: "resp-1",
          apologyId: "11111111-2222-3333-4444-555555555555",
          responseType: "quick",
          status: "published",
          content: { message: "Thank you!" },
          publishedAt: "2026-05-01T00:00:00.000Z",
        },
      ]);

      const req = new Request("http://localhost/api/experiences/11111111-2222-3333-4444-555555555555/responses");
      const res = await listCreatorResponses(req, {
        params: Promise.resolve({ experienceId: "11111111-2222-3333-4444-555555555555" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.responses).toHaveLength(1);
      expect(json.responses[0].content.message).toBe("Thank you!");
      // Verified: management capability token is NEVER exposed to creator
      expect(json.responses[0].manageToken).toBeUndefined();
      expect(json.responses[0].manageTokenHash).toBeUndefined();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 7. Upload validation, rate limits, and resource quotas                     */
  /* -------------------------------------------------------------------------- */
  describe("Upload validation and resource limits", () => {
    const validApologyId = "11111111-2222-3333-4444-555555555555";
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    function createMultipartRequest(form: FormData): Request {
      const req = new Request("http://localhost/api/responses/upload", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=----boundary" },
      });
      Object.defineProperty(req, "formData", {
        value: async () => form,
      });
      return req;
    }

    it("returns 429 when rate limit is exceeded on upload", async () => {
      mockEnforceRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, reset: 30 });

      const req = new Request("http://localhost/api/responses/upload", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=---boundary" },
      });
      const res = await uploadResponseAsset(req);
      expect(res.status).toBe(429);
    });

    it("rejects non-multipart requests with 415", async () => {
      const req = new Request("http://localhost/api/responses/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: "some-data" }),
      });
      const res = await uploadResponseAsset(req);
      expect(res.status).toBe(415);
    });

    it("rejects invalid/unsupported file mime contents with 415", async () => {
      const textBytes = new TextEncoder().encode("Hello world this is not an image");
      const form = new FormData();
      form.append("file", new File([textBytes], "hello.txt", { type: "text/plain" }));
      form.append("apologyId", validApologyId);

      const req = createMultipartRequest(form);
      const res = await uploadResponseAsset(req);
      expect(res.status).toBe(415);
      expect(mockRepo.reserveResponseAsset).not.toHaveBeenCalled();
    });

    it("rejects files exceeding 4 MB per-file limit with 413", async () => {
      const largeFile = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
      const form = new FormData();
      form.append("file", largeFile);
      form.append("apologyId", validApologyId);

      const req = createMultipartRequest(form);
      const res = await uploadResponseAsset(req);
      expect(res.status).toBe(413);
      expect(mockRepo.reserveResponseAsset).not.toHaveBeenCalled();
    });

    it("returns 409 when response aggregate storage quota (16 MB) is exceeded", async () => {
      mockRepo.createDraft.mockResolvedValue({ id: "22222222-2222-4000-8000-222222222222" });
      mockRepo.reserveResponseAsset.mockResolvedValue(null); // Quota exceeded in DB check

      const form = new FormData();
      form.append("file", new File([pngBytes], "photo.png", { type: "image/png" }));
      form.append("apologyId", validApologyId);
      form.append("responseId", "22222222-2222-4000-8000-222222222222");

      const req = createMultipartRequest(form);
      const res = await uploadResponseAsset(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/16 MB total reached/i);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 9. Experience Reply publication security                                  */
  /* -------------------------------------------------------------------------- */
  describe("Experience Reply publication security", () => {
    const validApologyId = "11111111-2222-4000-8000-111111111111";

    it("rejects experience reply with malformed parent ID with 404", async () => {
      const req = new Request("http://localhost/api/experiences/bad-id/responses/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceType: "birthday", content: {} }),
      });
      const res = await experienceReplyHandler(req, {
        params: Promise.resolve({ experienceId: "bad-id" }),
      });
      expect(res.status).toBe(404);
      expect(mockRepo.createDraft).not.toHaveBeenCalled();
    });

    it("enforces rate limits on experience reply publication with 429", async () => {
      mockEnforceRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, reset: 60 });
      const req = new Request(`http://localhost/api/experiences/${validApologyId}/responses/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceType: "birthday", content: {} }),
      });
      const res = await experienceReplyHandler(req, {
        params: Promise.resolve({ experienceId: validApologyId }),
      });
      expect(res.status).toBe(429);
      expect(mockRepo.createDraft).not.toHaveBeenCalled();
    });

    it("rejects unknown experience types with 400", async () => {
      const req = new Request(`http://localhost/api/experiences/${validApologyId}/responses/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceType: "unknown_exp", content: {} }),
      });
      const res = await experienceReplyHandler(req, {
        params: Promise.resolve({ experienceId: validApologyId }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/unknown experience type/i);
      expect(mockRepo.createDraft).not.toHaveBeenCalled();
    });

    it("rejects experience payload that violates module draftSchema with 400", async () => {
      const req = new Request(`http://localhost/api/experiences/${validApologyId}/responses/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceType: "birthday",
          content: { recipientName: "", senderName: "" }, // Missing required headline & message
        }),
      });
      const res = await experienceReplyHandler(req, {
        params: Promise.resolve({ experienceId: validApologyId }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/check the highlighted fields/i);
      expect(mockRepo.createDraft).not.toHaveBeenCalled();
    });

    it("rejects when parent experience is revoked, deleted or inaccessible with 404", async () => {
      mockRepo.createDraft.mockRejectedValueOnce(new Error("PARENT_NOT_ACCESSIBLE"));
      const req = new Request(`http://localhost/api/experiences/${validApologyId}/responses/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceType: "birthday",
          content: {
            recipientName: "Taylor",
            senderName: "Jordan",
            headline: "Happy Birthday!",
            message: "Have a wonderful year ahead.",
            themeId: "confetti",
          },
        }),
      });
      const res = await experienceReplyHandler(req, {
        params: Promise.resolve({ experienceId: validApologyId }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/no longer accessible/i);
    });

    it("publishes experience reply successfully returning dual capability tokens with 201", async () => {
      mockRepo.createDraft.mockResolvedValueOnce({ id: "draft-exp-123" });
      mockRepo.publishResponse.mockResolvedValueOnce({
        publicToken: "pub-exp-token",
        manageToken: "mgmt-exp-token",
      });

      const req = new Request(`http://localhost/api/experiences/${validApologyId}/responses/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceType: "birthday",
          content: {
            recipientName: "Taylor",
            senderName: "Jordan",
            headline: "Happy Birthday!",
            message: "Have a wonderful year ahead.",
            themeId: "confetti",
          },
        }),
      });
      const res = await experienceReplyHandler(req, {
        params: Promise.resolve({ experienceId: validApologyId }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.publicToken).toBe("pub-exp-token");
      expect(body.manageToken).toBe("mgmt-exp-token");
      expect(body.publicUrl).toBe("/response/pub-exp-token");
      expect(body.manageUrl).toBe("/response/manage/mgmt-exp-token");

      expect(mockRepo.createDraft).toHaveBeenCalledWith(
        validApologyId,
        "experience",
        expect.objectContaining({
          experienceType: "birthday",
        })
      );
      expect(mockRepo.publishResponse).toHaveBeenCalledWith(
        "draft-exp-123",
        expect.objectContaining({
          experienceType: "birthday",
        })
      );
    });

    it("rejects publishing when responseId is not a valid UUID with 400", async () => {
      const req = new Request(`http://localhost/api/experiences/${validApologyId}/responses/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId: "not-a-valid-uuid",
          experienceType: "birthday",
          content: {
            recipientName: "Taylor",
            senderName: "Jordan",
            headline: "Happy Birthday!",
            message: "Have a wonderful year ahead.",
            themeId: "confetti",
          },
        }),
      });
      const res = await experienceReplyHandler(req, {
        params: Promise.resolve({ experienceId: validApologyId }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid draft ID/i);
    });

    it("rejects publishing when responseId draft belongs to a different parent apology with 404", async () => {
      const foreignDraftId = "88888888-8888-4000-8000-888888888888";
      mockRepo.getDraft.mockResolvedValueOnce({
        id: foreignDraftId,
        apologyId: "different-parent-apology-uuid",
      });

      const req = new Request(`http://localhost/api/experiences/${validApologyId}/responses/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId: foreignDraftId,
          experienceType: "birthday",
          content: {
            recipientName: "Taylor",
            senderName: "Jordan",
            headline: "Happy Birthday!",
            message: "Have a wonderful year ahead.",
            themeId: "confetti",
          },
        }),
      });
      const res = await experienceReplyHandler(req, {
        params: Promise.resolve({ experienceId: validApologyId }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/Draft could not be found/i);
      expect(mockRepo.publishResponse).not.toHaveBeenCalled();
    });

    it("rejects publishing when responseId draft does not exist with 404", async () => {
      const nonexistentDraftId = "77777777-7777-4000-8000-777777777777";
      mockRepo.getDraft.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/experiences/${validApologyId}/responses/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId: nonexistentDraftId,
          experienceType: "birthday",
          content: {
            recipientName: "Taylor",
            senderName: "Jordan",
            headline: "Happy Birthday!",
            message: "Have a wonderful year ahead.",
            themeId: "confetti",
          },
        }),
      });
      const res = await experienceReplyHandler(req, {
        params: Promise.resolve({ experienceId: validApologyId }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/Draft could not be found/i);
      expect(mockRepo.publishResponse).not.toHaveBeenCalled();
    });
  });
});
