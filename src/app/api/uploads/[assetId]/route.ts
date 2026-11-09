import { getOwner } from "@/lib/security/owner";
import { getObjectStore, getRepository } from "@/lib/storage";
import { canServeAsset } from "@/lib/storage/asset-access";
import { isValidAssetId, presignAssetUrl } from "@/lib/storage/uploads";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AssetRouteContext = { params: Promise<{ assetId: string }> };

/**
 * Media is never served directly and never cached. The route authorises by
 * asset row → owning apology → liveness, then redirects to a 60-second
 * pre-signed URL.
 *
 * A leaked object key is therefore useless: the key is never in a URL the
 * browser keeps, and the asset id alone still requires a live letter.
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

  if (!isValidAssetId(assetId)) return jsonError(404, "That file could not be found.");

  try {
    const owner = await getOwner();
    const asset = await getRepository().getAssetForServing(assetId);

    if (!asset || !canServeAsset({ asset, ownerKeyHash: owner?.hash })) {
      return jsonError(404, "That file could not be found.");
    }

    const url = await presignAssetUrl({ objects: getObjectStore() }, asset);

    return new Response(null, {
      status: 307,
      headers: {
        Location: url,
        // The signed URL is a short-lived bearer token: never cache the hop.
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

/** Owner-only removal. The row is kept as `failed` so its key stays traceable. */
export async function DELETE(_request: Request, context: AssetRouteContext) {
  const { assetId } = await context.params;

  try {
    const owner = await getOwner();
    if (!owner) return jsonError(403, "You do not have access to that file.");
    if (!isValidAssetId(assetId)) return jsonOk({ ok: true });

    const asset = await getRepository().getAssetForServing(assetId);
    if (!asset || asset.ownerKeyHash !== owner.hash) {
      return jsonError(403, "You do not have access to that file.");
    }

    await getObjectStore().deleteMany([asset.objectKey]);
    await getRepository().failAsset(assetId);
    return jsonOk({ ok: true });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
