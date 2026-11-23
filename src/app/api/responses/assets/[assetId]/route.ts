import { getCreator } from "@/lib/security/creator";
import { getObjectStore, getResponseRepository } from "@/lib/storage";
import { hashResponseToken } from "@/lib/id";
import { isResponseLive } from "@/lib/expiry";
import { jsonError, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PRESIGN_TTL_SECONDS = 60;

type AssetRouteContext = { params: Promise<{ assetId: string }> };

/**
 * Capability-gated media serving for response photos.
 *
 * Media is never served directly and never cached.
 * Access requires either:
 * - A valid publicToken or manageToken corresponding to the response, OR
 * - An authenticated creator session matching the parent experience owner.
 *
 * Returns a 307 redirect to a 60-second pre-signed URL with no-cache and no-referrer.
 */
export async function GET(request: Request, context: AssetRouteContext) {
  const { assetId } = await context.params;

  const limit = await enforceRateLimit(request, "serveUpload");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }

  if (!/^[0-9a-f-]{36}$/i.test(assetId)) {
    return jsonError(404, "That file could not be found.");
  }

  try {
    const repository = getResponseRepository();
    const asset = await repository.getAssetForServing(assetId);

    if (!asset || asset.state !== "uploaded") {
      return jsonError(404, "That file could not be found.");
    }

    if (!isResponseLive(asset.responseStatus, asset.apologyStatus)) {
      return jsonError(404, "That file is no longer accessible.");
    }

    // Check capability token from query string (?token=...)
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    let authorized = false;

    if (token && /^[A-Za-z0-9_-]{10,96}$/.test(token)) {
      const tokenHash = hashResponseToken(token);
      if (tokenHash === asset.publicTokenHash || tokenHash === asset.manageTokenHash) {
        authorized = true;
      }
    }

    // Fall back to checking parent creator session
    if (!authorized) {
      const creator = await getCreator();
      if (creator && creator.key === asset.parentOwnerKeyHash) {
        authorized = true;
      }
    }

    if (!authorized) {
      return jsonError(404, "That file could not be found.");
    }

    const presigned = await getObjectStore().presignGet(asset.objectKey, PRESIGN_TTL_SECONDS);

    return new Response(null, {
      status: 307,
      headers: {
        Location: presigned,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
