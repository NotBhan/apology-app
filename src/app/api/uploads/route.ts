import { getOwner } from "@/lib/security/owner";
import { getRepository } from "@/lib/storage";
import { listUploads, saveUpload, UploadError } from "@/lib/storage/uploads";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Upload identity model:
 *
 * - The creator cookie decides who may attach files.
 * - Every asset is bound to the draft it was uploaded for, and to the owner's
 *   key hash. That binding is what lets the serve route refuse media once the
 *   apology's link is no longer live.
 * - The asset id remains a 128-bit capability token, but capability alone is
 *   no longer sufficient: access also requires a live letter or ownership.
 */

/** Lists the caller's own assets, newest first. */
export async function GET() {
  try {
    const owner = await getOwner();
    if (!owner) return jsonOk({ assets: [] });

    const assets = (await listUploads()).filter(
      (asset) => asset.ownerKeyHash === owner.hash,
    );
    return jsonOk({ assets });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

/** `multipart/form-data` with a `file` field and the owning `draftId`. */
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
    const owner = await getOwner();
    if (!owner) return jsonError(403, "Start a letter before uploading files.");

    // The upload must belong to a draft this browser actually owns.
    const repository = await getRepository();
    const record = await repository.getDraft(draftId);
    if (!record || record.ownerKeyHash !== owner.hash) {
      return jsonError(403, "You do not have access to that draft.");
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const asset = await saveUpload({
      data,
      declaredMime: file.type,
      apologyId: draftId,
      ownerKeyHash: owner.hash,
    });
    return jsonOk({ asset }, 201);
  } catch (error) {
    if (error instanceof UploadError) {
      return jsonError(error.status, error.message);
    }
    console.error("[api] upload failed:", error);
    return jsonError(500, "That file could not be saved. Please try again.");
  }
}
