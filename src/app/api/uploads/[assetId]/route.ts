import { readUpload, removeUpload } from "@/lib/storage/uploads";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** One year, immutable: asset ids are content-addressed by randomness, never reused. */
const IMMUTABLE_CACHE = "private, max-age=31536000, immutable";

type AssetRouteContext = { params: Promise<{ assetId: string }> };

/** Serves the recorded bytes with the MIME type detected at upload time. */
export async function GET(_request: Request, context: AssetRouteContext) {
  const { assetId } = await context.params;

  try {
    const stored = await readUpload(assetId);
    if (!stored) return jsonError(404, "That file could not be found.");

    // `new Response` needs an ArrayBuffer-backed body; copy into a plain buffer
    // so the type is exact and the bytes cannot be mutated after this point.
    const body = new ArrayBuffer(stored.bytes.byteLength);
    new Uint8Array(body).set(stored.bytes);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": stored.asset.mime,
        "Content-Length": String(body.byteLength),
        // Immutable bytes reached through an unguessable capability URL. This is
        // the one deliberate exception to the no-store rule: recipients must be
        // able to cache a photo for the life of the letter.
        "Cache-Control": IMMUTABLE_CACHE,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

/**
 * Removes an asset (bytes + sidecar). Idempotent, and only reachable with the
 * server-minted asset id.
 */
export async function DELETE(_request: Request, context: AssetRouteContext) {
  const { assetId } = await context.params;

  try {
    await removeUpload(assetId);
    return jsonOk({ ok: true });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
