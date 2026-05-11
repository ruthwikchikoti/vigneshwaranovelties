import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { refreshSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Admin pages — refresh Supabase session, no i18n routing.
  if (path.startsWith("/admin")) {
    return await refreshSession(request);
  }

  // API routes — let them through untouched (no i18n prefixing, no auth refresh).
  if (path.startsWith("/api")) {
    return NextResponse.next();
  }

  // Public routes — i18n routing.
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
