import { requireApiCreator } from "@/lib/security/creator";
import { getObjectStore, getRepository } from "@/lib/storage";
import { storeUpload, UploadError } from "@/lib/storage/uploads";
import { jsonError, jsonOk } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Upload identity model:
 *
 * - The creator cookie decides who may attach files.
 * - The asset row is reserved **before** the object is written, so every object
 *   that can ever exist is already visible to deletion intent.
 * - Completion is conditional on the apology still being editable; if deletion
 *   started mid-upload, the object is removed and never attached.
 */
export async function POST(request: Request) {
  const limit = await enforceRateLimit(request, "upload");
  if (!limit.allowed) {
    return jsonError(
      429,
      "Too many requests. Try again shortly.",
      undefined,
      rateLimitHeaders(limit),
    );
  }

  const authz = await requireApiCreator();
  if (!authz.ok) return authz.response;

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return jsonError(415, "Upload the file as multipart/form-data.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, 'Send the file in a form field named "file".');
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, 'Attach the file in a form field named "file".');
  }
  if (file.size === 0) {
    return jsonError(400, "That file is empty.");
  }

  const draftId = form.get("draftId");
  if (typeof draftId !== "string" || draftId.length === 0) {
    return jsonError(400, 'Send the owning draft in a field named "draftId".');
  }

  try {
    const owner = { hash: authz.creator.key };

    const data = new Uint8Array(await file.arrayBuffer());
    const asset = await storeUpload(
      { repository: getRepository(), objects: getObjectStore() },
      {
        data,
        declaredMime: file.type,
        apologyId: draftId,
        ownerKeyHash: owner.hash,
      },
    );

    return jsonOk(
      {
        asset: {
          id: asset.id,
          kind: asset.kind,
          mime: asset.contentType,
          size: asset.sizeBytes,
          createdAt: asset.createdAt,
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof UploadError) return jsonError(error.status, error.message);
    console.error("[api] upload failed:", error);
    return jsonError(500, "That file could not be saved. Please try again.");
  }
}
