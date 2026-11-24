import { getObjectStore, getResponseRepository } from "@/lib/storage";
import { MAX_PHOTO_BYTES, PHOTO_MIME_TYPES, sniffUploadMime } from "@/lib/storage/uploads";
import { extensionForMime } from "@/lib/storage/upload-lifecycle";
import { randomId } from "@/lib/id";
import { jsonError, jsonOk } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildResponseObjectKey(responseId: string, extension: string): string {
  const safe = extension.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 5) || "bin";
  return `responses/${responseId}/${randomId(16)}.${safe}`;
}

/**
 * Anonymous photo upload for responses.
 *
 * Enforces the strict upload invariant:
 * 1. An asset row is pre-reserved as 'pending' in response_assets before S3 write.
 * 2. File bytes are written to S3.
 * 3. Asset row is promoted to 'uploaded'.
 * 4. In case of failure, asset is marked failed to guarantee no orphaned S3 objects.
 */
export async function POST(request: Request) {
  const limit = await enforceRateLimit(request, "upload");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }

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
  if (file.size > MAX_PHOTO_BYTES) {
    return jsonError(413, "Photos must be 4 MB or smaller.");
  }

  const apologyId = form.get("apologyId");
  if (typeof apologyId !== "string" || !/^[0-9a-f-]{36}$/i.test(apologyId)) {
    return jsonError(400, "A valid parent apology ID is required.");
  }

  const existingResponseId = form.get("responseId");
  let responseId = typeof existingResponseId === "string" && /^[0-9a-f-]{36}$/i.test(existingResponseId)
    ? existingResponseId
    : undefined;

  const data = new Uint8Array(await file.arrayBuffer());
  const mime = sniffUploadMime(data);

  if (!mime || !(PHOTO_MIME_TYPES as readonly string[]).includes(mime)) {
    return jsonError(415, "Unsupported file. Please upload a JPEG, PNG, or WebP image.");
  }

  const repository = getResponseRepository();
  const objects = getObjectStore();

  try {
    if (!responseId) {
      const requestedType = form.get("responseType");
      const resType = requestedType === "experience" ? "experience" : "quick";
      const draft = await repository.createDraft(apologyId, resType);
      responseId = draft.id;
    }

    const ext = extensionForMime(mime);
    const objectKey = buildResponseObjectKey(responseId, ext);

    const reservation = await repository.reserveResponseAsset({
      responseId,
      apologyId,
      objectKey,
      kind: "photo",
      contentType: mime,
      sizeBytes: data.byteLength,
      maxAssets: 10,
      maxTotalBytes: 16 * 1024 * 1024,
    });

    if (!reservation) {
      return jsonError(409, "This response can no longer accept photos (maximum 10 photos or 16 MB total reached).");
    }

    try {
      await objects.put(objectKey, data, mime);
    } catch {
      await repository.failAsset(reservation.id).catch(() => undefined);
      return jsonError(502, "Storage upload failed. Please try again.");
    }

    const promoted = await repository.promoteResponseAsset(reservation.id, objectKey, data.byteLength);
    if (!promoted) {
      await objects.deleteMany([objectKey]).catch(() => undefined);
      await repository.failAsset(reservation.id).catch(() => undefined);
      return jsonError(409, "This response can no longer be edited.");
    }

    return jsonOk(
      {
        asset: {
          id: reservation.id,
          url: `/api/responses/assets/${reservation.id}`,
        },
        responseId,
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "PARENT_NOT_ACCESSIBLE") {
      return jsonError(404, "The parent experience is no longer accessible.");
    }
    console.error("[api] response upload failed:", error);
    return jsonError(500, "The photo could not be saved. Please try again.");
  }
}
