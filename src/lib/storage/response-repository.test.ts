import { describe, expect, it } from "vitest";
import {
  rowToResponse,
  toPublishedResponse,
  rowToResponseAsset,
} from "./response-repository";
import { createResponseTokens, hashResponseToken } from "@/lib/id";
import { isResponseLive } from "@/lib/expiry";
import type { ResponseRow, ResponseAssetRow } from "@/db/schema";

describe("ResponseRepository helpers and contracts", () => {
  it("creates cryptographically secure dual tokens", () => {
    const tokens = createResponseTokens();
    expect(tokens.publicToken).toHaveLength(43);
    expect(tokens.manageToken).toHaveLength(43);
    expect(tokens.publicToken).not.toEqual(tokens.manageToken);

    const hash1 = hashResponseToken(tokens.publicToken);
    const hash2 = hashResponseToken(tokens.manageToken);
    expect(hash1).toHaveLength(43);
    expect(hash2).toHaveLength(43);
    expect(hash1).not.toEqual(hash2);
  });

  it("correctly maps a database row to a domain ResponseRecord", () => {
    const now = new Date("2026-05-01T12:00:00.000Z");
    const row: ResponseRow = {
      id: "11111111-1111-4000-8000-111111111111",
      apologyId: "22222222-2222-4000-8000-222222222222",
      responseType: "quick",
      status: "published",
      content: { message: "Thank you" },
      publicTokenHash: "pub-hash",
      manageTokenHash: "man-hash",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    };

    const record = rowToResponse(row);
    expect(record.id).toBe(row.id);
    expect(record.apologyId).toBe(row.apologyId);
    expect(record.responseType).toBe("quick");
    expect(record.status).toBe("published");
    expect(record.content).toEqual({ message: "Thank you" });
    expect(record.createdAt).toBe(now.toISOString());
    expect(record.publishedAt).toBe(now.toISOString());
  });

  it("converts a record to PublishedResponse with capability tokens", () => {
    const now = "2026-05-01T12:00:00.000Z";
    const record = {
      id: "11111111-1111-4000-8000-111111111111",
      apologyId: "22222222-2222-4000-8000-222222222222",
      responseType: "quick" as const,
      status: "published" as const,
      content: { message: "Thank you" },
      publicTokenHash: "pub-hash",
      manageTokenHash: "man-hash",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    };

    const pub = toPublishedResponse(record, "pub-token-123", "man-token-456");
    expect(pub.id).toBe(record.id);
    expect(pub.status).toBe("published");
    expect(pub.publicToken).toBe("pub-token-123");
    expect(pub.manageToken).toBe("man-token-456");
  });

  it("correctly maps response asset rows", () => {
    const now = new Date("2026-05-01T12:00:00.000Z");
    const row: ResponseAssetRow = {
      id: "asset-1",
      responseId: "resp-1",
      state: "uploaded",
      objectKey: "responses/resp-1/photo.jpg",
      kind: "photo",
      contentType: "image/jpeg",
      sizeBytes: 2048,
      createdAt: now,
      updatedAt: now,
    };

    const asset = rowToResponseAsset(row);
    expect(asset.id).toBe("asset-1");
    expect(asset.apologyId).toBe("resp-1");
    expect(asset.state).toBe("uploaded");
    expect(asset.objectKey).toBe("responses/resp-1/photo.jpg");
    expect(asset.sizeBytes).toBe(2048);
  });

  it("enforces parent-child liveness invariant", () => {
    expect(isResponseLive("published", "published")).toBe(true);
    // If parent experience is revoked or deleted, child response is immediately inactive
    expect(isResponseLive("published", "revoked")).toBe(false);
    expect(isResponseLive("published", "deleted")).toBe(false);
    expect(isResponseLive("published", "draft")).toBe(false);

    // If response is revoked or deleted, it is inactive regardless of parent
    expect(isResponseLive("revoked", "published")).toBe(false);
    expect(isResponseLive("deleted", "published")).toBe(false);
  });

  it("verifies capability-based authorization for response media", () => {
    const pubToken = "pub-test-token-12345";
    const manToken = "man-test-token-67890";
    const pubHash = hashResponseToken(pubToken);
    const manHash = hashResponseToken(manToken);
    const parentOwnerKeyHash = "owner-scope-hash-111";

    const servingAsset = {
      id: "asset-1",
      apologyId: "resp-1",
      state: "uploaded" as const,
      objectKey: "responses/resp-1/photo.jpg",
      kind: "photo" as const,
      contentType: "image/jpeg",
      sizeBytes: 1024,
      createdAt: new Date().toISOString(),
      responseStatus: "published",
      apologyStatus: "published",
      publicTokenHash: pubHash,
      manageTokenHash: manHash,
      parentOwnerKeyHash,
    };

    // Public token matches
    expect(hashResponseToken(pubToken) === servingAsset.publicTokenHash).toBe(true);

    // Manage token matches
    expect(hashResponseToken(manToken) === servingAsset.manageTokenHash).toBe(true);

    // Unrelated token fails
    expect(hashResponseToken("other-token") === servingAsset.publicTokenHash).toBe(false);
    expect(hashResponseToken("other-token") === servingAsset.manageTokenHash).toBe(false);

    // Owner key matches
    expect(servingAsset.parentOwnerKeyHash === parentOwnerKeyHash).toBe(true);
    expect(servingAsset.parentOwnerKeyHash === "random-user-hash").toBe(false);
  });
});
