import { getOwner } from "@/lib/security/owner";
import { getRepository } from "@/lib/storage";
import { readUpload, removeUpload } from "@/lib/storage/uploads";
import { canServeAsset } from "@/lib/storage/asset-access";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Media is never cacheable by a shared cache and never served past the life of
 * the apology it belongs to. `no-store` is deliberate: authorisation changes at
 * the exact expiry timestamp, so a cached copy would outlive the link.
 */
const PRIVATE_NO_STORE = "private, no-store";

type AssetRouteContext = { params: Promise<{ assetId: string }> };

/**
 * Serves an asset to its owner, or to anyone while the owning apology is live.
 *
 * This is the second half of expiry enforcement: revoking a record is not
 * enough if the photos it referenced stay reachable from a saved URL.
 */
export async function GET(request: Request, context: AssetRouteContext) {
  const { assetId } = await context.params;

  const limit = await enforceRateLimit(request, "serveUpload");
  if (!limit.allowed) {
    return jsonError(
      429,
      "Too many requests. Try again shortly.",
      undefined,
      rateLimitHeaders(limit),
    );
  }

  try {
    const stored = await readUpload(assetId);
    if (!stored) return jsonError(404, "That file could not be found.");

    const asset = stored.asset;
    const owner = await getOwner();

    // Owner, or anyone while the owning letter is live. Unbound assets fail
    // closed rather than becoming anonymously readable.
    const repository = await getRepository();
    const record = asset.apologyId ? await repository.getDraft(asset.apologyId) : undefined;

    if (!canServeAsset({ asset, ownerKeyHash: owner?.hash, record })) {
      return jsonError(404, "That file could not be found.");
    }

    // `new Response` needs an ArrayBuffer-backed body; copy into a plain buffer
    // so the type is exact and the bytes cannot be mutated after this point.
    const body = new ArrayBuffer(stored.bytes.byteLength);
    new Uint8Array(body).set(stored.bytes);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": asset.mime,
        "Content-Length": String(body.byteLength),
        "Cache-Control": PRIVATE_NO_STORE,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

/** Owner-only removal. Idempotent. */
export async function DELETE(_request: Request, context: AssetRouteContext) {
  const { assetId } = await context.params;

  try {
    const owner = await getOwner();
    if (!owner) return jsonError(403, "You do not have access to that file.");

    const stored = await readUpload(assetId);
    if (!stored) return jsonOk({ ok: true });
    if (stored.asset.ownerKeyHash !== owner.hash) {
      return jsonError(403, "You do not have access to that file.");
    }

    await removeUpload(assetId);
    return jsonOk({ ok: true });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
