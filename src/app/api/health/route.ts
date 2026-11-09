import { configuredServices } from "@/lib/env";
import { jsonOk } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

/**
 * Liveness probe that also reports which persistence backend is in use.
 * Deliberately says nothing about configuration values or secrets.
 */
export async function GET() {
  const services = configuredServices();
  return jsonOk({
    ok: services.database,
    database: services.database ? "postgres" : "unconfigured",
    storage: services.storage ? "filebase" : "unconfigured",
    cleanupSecret: services.cleanupSecret ? "configured" : "unconfigured",
  });
}
