import { listUploads, saveUpload, UploadError } from "@/lib/storage/uploads";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Uploads are stored on the filesystem (`.data/uploads`), because the bytes are
 * served back from this same deployment rather than from the database.
 *
 * Identity model: an asset id is a 128-bit capability token minted by the
 * server. The bytes are readable by anyone holding that id (the recipient of a
 * letter must be able to load the photos), but ids are never derived from the
 * client filename and cannot be enumerated by guessing.
 */

/** Lists the stored asset metadata, newest first. */
export async function GET() {
  try {
    const assets = await listUploads();
    return jsonOk({ assets });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

/** `multipart/form-data` with a single `file` field. */
export async function POST(request: Request) {
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

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const asset = await saveUpload({ data, declaredMime: file.type });
    return jsonOk({ asset }, 201);
  } catch (error) {
    if (error instanceof UploadError) {
      return jsonError(error.status, error.message);
    }
    console.error("[api] upload failed:", error);
    return jsonError(500, "That file could not be saved. Please try again.");
  }
}
