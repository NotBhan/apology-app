import { getResponseRepository } from "@/lib/storage";
import { manageResponseActionSchema } from "@/lib/validation/response";
import { jsonError, jsonOk, readJsonBody, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";

const SECURE_MANAGE_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  "Referrer-Policy": "no-referrer",
};

export function extractManageTokenFromHeaders(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (/^[A-Za-z0-9_-]{10,96}$/.test(bearer)) return bearer;
  }
  const xHeader = request.headers.get("x-manage-token");
  if (xHeader && /^[A-Za-z0-9_-]{10,96}$/.test(xHeader)) return xHeader;
  return null;
}

/**
 * Header-based management endpoint for responses.
 *
 * Transmits the bearer capability exclusively via Authorization: Bearer <token>
 * or x-manage-token headers. The management token never appears in the URL path,
 * query string, or server access logs.
 */
export async function GET(request: Request) {
  const manageToken = extractManageTokenFromHeaders(request);

  const limit = await enforceRateLimit(request, "serveUpload");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, {
      ...rateLimitHeaders(limit),
      ...SECURE_MANAGE_HEADERS,
    });
  }

  if (!manageToken) {
    return jsonError(401, "Management authorization header missing or malformed.", undefined, SECURE_MANAGE_HEADERS);
  }

  try {
    const repository = getResponseRepository();
    const record = await repository.getByManageToken(manageToken);

    if (!record) {
      return jsonError(404, "We could not find that response.", undefined, SECURE_MANAGE_HEADERS);
    }

    return jsonOk(
      {
        id: record.id,
        status: record.status,
        responseType: record.responseType,
        content: record.content,
        publishedAt: record.publishedAt,
        createdAt: record.createdAt,
      },
      200,
      SECURE_MANAGE_HEADERS,
    );
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const manageToken = extractManageTokenFromHeaders(request);

  const limit = await enforceRateLimit(request, "publish");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, {
      ...rateLimitHeaders(limit),
      ...SECURE_MANAGE_HEADERS,
    });
  }

  if (!manageToken) {
    return jsonError(401, "Management authorization header missing or malformed.", undefined, SECURE_MANAGE_HEADERS);
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Invalid JSON body.", undefined, SECURE_MANAGE_HEADERS);
  }

  const parsed = manageResponseActionSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid action.", undefined, SECURE_MANAGE_HEADERS);
  }

  const { action } = parsed.data;
  const repository = getResponseRepository();

  try {
    const existing = await repository.getByManageToken(manageToken);
    if (!existing) {
      return jsonError(404, "Response not found or management token invalid.", undefined, SECURE_MANAGE_HEADERS);
    }

    if (action === "revoke") {
      if (existing.status !== "published") {
        return jsonError(409, "The response cannot transition to the requested state.", undefined, SECURE_MANAGE_HEADERS);
      }
      const record = await repository.revokeResponse(manageToken);
      return jsonOk({ ok: true, status: record?.status ?? "revoked" }, 200, SECURE_MANAGE_HEADERS);
    }

    if (action === "restore") {
      if (existing.status !== "revoked") {
        return jsonError(409, "The response cannot transition to the requested state.", undefined, SECURE_MANAGE_HEADERS);
      }
      const record = await repository.restoreResponse(manageToken);
      return jsonOk({ ok: true, status: record?.status ?? "published" }, 200, SECURE_MANAGE_HEADERS);
    }

    if (action === "delete") {
      const ok = await repository.deleteResponse(manageToken);
      return jsonOk({ ok, status: "deleted" }, 200, SECURE_MANAGE_HEADERS);
    }

    return jsonError(400, "Unsupported action.", undefined, SECURE_MANAGE_HEADERS);
  } catch (error) {
    if (error instanceof Error && (error.message === "REVOKE_NOT_ALLOWED" || error.message === "RESTORE_NOT_ALLOWED")) {
      return jsonError(409, "The response cannot transition to the requested state.", undefined, SECURE_MANAGE_HEADERS);
    }
    return repositoryErrorResponse(error);
  }
}
