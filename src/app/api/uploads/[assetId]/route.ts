import { getCreator, requireApiCreator } from "@/lib/security/creator";
import { getObjectStore, getRepository } from "@/lib/storage";
import { canServeAsset } from "@/lib/storage/asset-access";
import { isValidAssetId, presignAssetUrl } from "@/lib/storage/uploads";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";
import type { ApologyRecord } from "@/types/apology";

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
    const creator = await getCreator();
    const asset = await getRepository().getAssetForServing(assetId);

    const ownerHash =
      creator && asset?.ownerKeyHash === creator.legacyKey
        ? creator.legacyKey
        : creator?.key;

    if (!asset || !canServeAsset({ asset, ownerKeyHash: ownerHash })) {
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

function isAssetReferencedInRecord(record: ApologyRecord, assetId: string): boolean {
  if (record.customization?.audio?.assetId === assetId) return true;
  if (
    record.customization?.photos?.some(
      (photo) => photo.id === assetId || photo.url.includes(assetId),
    )
  ) {
    return true;
  }
  if (record.content && JSON.stringify(record.content).includes(assetId)) {
    return true;
  }
  return false;
}

/** Owner-only removal. The row is kept as `failed` so its key stays traceable. */
export async function DELETE(_request: Request, context: AssetRouteContext) {
  const { assetId } = await context.params;

  try {
    const authz = await requireApiCreator();
    if (!authz.ok) return authz.response;
    if (!isValidAssetId(assetId)) return jsonOk({ ok: true });

    const repo = getRepository();
    const asset = await repo.getAssetForServing(assetId);
    const ownerHash =
      asset && asset.ownerKeyHash === authz.creator.legacyKey
        ? authz.creator.legacyKey
        : authz.creator.key;

    if (!asset || !ownerHash || asset.ownerKeyHash !== ownerHash) {
      return jsonError(403, "You do not have access to that file.");
    }

    if (asset.apologyStatus === "published") {
      const record = await repo.getDraft(asset.apologyId);
      if (!record || isAssetReferencedInRecord(record, assetId)) {
        return jsonError(
          409,
          "This file is still used by a published link. Save your edits first before deleting it.",
        );
      }
    }

    const deleted = await getObjectStore().deleteMany([asset.objectKey]);
    if (deleted.failed.length > 0) {
      return jsonError(502, "Could not delete that file. Try again.");
    }
    await repo.removeAsset(assetId, ownerHash);
    return jsonOk({ ok: true });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
