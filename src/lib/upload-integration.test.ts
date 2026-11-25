import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeBackend, makeRecord } from "@/test/adapters/fake-backend";
import { createFakeObjectStore } from "@/test/adapters/fake-object-store";
import { storeUpload } from "@/lib/storage/uploads";
import { canServeAsset } from "@/lib/storage/asset-access";
import { runCleanup } from "@/lib/lifecycle/protocol";
import { toOptimizedUploadFile, uploadFile } from "./upload";

const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ...new Array(40_000).fill(0xab),
]);

describe("Upload & Storage Lifecycle Integration for Optimized Images", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("10. uploads optimized WebP Blob with matching extension and MIME type", async () => {
    const webpBlob = new Blob([WEBP_BYTES], { type: "image/webp" });
    const fileToUpload = toOptimizedUploadFile(webpBlob, "camera_shot.HEIC", "image/webp");
    expect(fileToUpload.name).toBe("camera_shot.webp");
    expect(fileToUpload.type).toBe("image/webp");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          asset: {
            id: "11111111-1111-4111-8111-111111111111",
            kind: "photo",
            mime: "image/webp",
            size: webpBlob.size,
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const uploaded = await uploadFile(
      fileToUpload,
      "photo",
      fileToUpload.name,
      "22222222-2222-4222-8222-222222222222",
    );

    expect(uploaded.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(uploaded.url).toBe("/api/uploads/11111111-1111-4111-8111-111111111111");
    const sentForm = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    const sentFile = sentForm.get("file") as File;
    expect(sentFile.name).toBe("camera_shot.webp");
    expect(sentFile.type).toBe("image/webp");
  });

  it("11 & 12. stores WebP in object storage, enforces asset quota using compressed bytes, serves live recipients, and cleans up completely", async () => {
    const backend = createFakeBackend();
    const objects = createFakeObjectStore();
    const deps = { repository: backend.repository, objects };

    const record = makeRecord({ ownerKeyHash: "creator-hash", status: "published" });
    backend.state.apologies.set(record.id, record);

    const asset = await storeUpload(deps, {
      data: WEBP_BYTES,
      declaredMime: "image/webp",
      apologyId: record.id,
      ownerKeyHash: "creator-hash",
    });

    expect(asset.contentType).toBe("image/webp");
    expect(asset.sizeBytes).toBe(WEBP_BYTES.byteLength);
    expect(asset.objectKey).toMatch(/\.webp$/);

    // Unauthenticated recipient can access live published WebP asset
    const serving = await backend.repository.getAssetForServing(asset.id);
    expect(serving).toBeDefined();
    expect(canServeAsset({ asset: serving!, ownerKeyHash: undefined })).toBe(true);

    // Revoking immediately cuts off recipient access
    record.status = "revoked";
    const revokedServing = await backend.repository.getAssetForServing(asset.id);
    expect(canServeAsset({ asset: revokedServing!, ownerKeyHash: undefined })).toBe(false);

    // Owner deletion cleans up Filebase object and apology row
    await backend.repository.requestDeletionByOwner(record.id, "creator-hash");
    const report = await runCleanup({ store: backend.lifecycle, objects });
    expect(report.deleted).toBe(1);
    expect(objects.objects.size).toBe(0);
  });
});
