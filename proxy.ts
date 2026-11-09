import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, getAuth } from "@/lib/auth/server";

/**
 * Route protection for creator surfaces only.
 *
 * This is a redirect for humans, not the authorization boundary: every API
 * route and server action calls `requireCreator()` independently, so bypassing
 * this file gains nothing. Recipient routes (`/letter/*`, `/api/letters/*`) are
 * not matched at all and stay public.
 */
export default async function proxy(request: NextRequest) {
  if (!authConfigured()) {
    // Fail closed on creator pages rather than serving them unauthenticated.
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  return getAuth().middleware({ loginUrl: "/auth/sign-in" })(request);
}

export const config = {
  matcher: ["/create/:path*", "/preview/:path*", "/manage"],
};
