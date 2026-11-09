import { getAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

/**
 * Proxies the auth client to Neon Auth.
 *
 * The handler is resolved per request rather than destructured at module load:
 * `getAuth()` needs `NEON_AUTH_COOKIE_SECRET`, and `next build` must not
 * require production secrets just to collect routes.
 */
export async function GET(request: Request, context: Context) {
  return getAuth().handler().GET(request, context);
}

export async function POST(request: Request, context: Context) {
  return getAuth().handler().POST(request, context);
}

export async function PUT(request: Request, context: Context) {
  return getAuth().handler().PUT(request, context);
}

export async function DELETE(request: Request, context: Context) {
  return getAuth().handler().DELETE(request, context);
}

export async function PATCH(request: Request, context: Context) {
  return getAuth().handler().PATCH(request, context);
}
