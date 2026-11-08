import { firebaseConfigured } from "@/lib/storage";
import { jsonOk } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

/**
 * Liveness probe that also reports which persistence backend is in use.
 * Deliberately says nothing about configuration values or secrets.
 */
export async function GET() {
  const storage = firebaseConfigured() ? "firestore" : "filesystem";
  return jsonOk({ ok: true, storage });
}
