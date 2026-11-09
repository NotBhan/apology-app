import { repositoryBackend } from "@/lib/storage";
import { uploadBackend } from "@/lib/storage/uploads";
import { rateLimitBackend } from "@/lib/security/rate-limit";
import { jsonOk } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

/**
 * Liveness probe that also reports which persistence backend is in use.
 * Deliberately says nothing about configuration values or secrets.
 */
export async function GET() {
  return jsonOk({
    ok: true,
    storage: repositoryBackend(),
    uploads: uploadBackend(),
    rateLimit: rateLimitBackend(),
  });
}
