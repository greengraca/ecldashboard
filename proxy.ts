import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticatedLimit, publicLimit } from "@/lib/rate-limit";

/** Public API paths (player/standings data for future public app) */
const PUBLIC_API_PATTERNS = [
  /^\/api\/players(\/|$)/,
  /^\/api\/media\/proxy(\/|$)/,
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PATTERNS.some((p) => p.test(pathname));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate-limit API routes
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const limiter = isPublicApi(pathname) ? publicLimit : authenticatedLimit;

    if (limiter) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "anonymous";

      const { success, limit, remaining, reset } = await limiter.limit(ip);

      if (!success) {
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": reset.toString(),
              "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    }
  }

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/media-capture");

  if (!isPublic) {
    const session = await auth();
    if (!session) {
      const loginUrl = new URL("/login", request.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
