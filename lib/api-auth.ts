import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { authenticatedLimit } from "./rate-limit";
import { logAuthFailure, logRateLimitHit } from "./error-log";
import type { Session } from "next-auth";

type AuthResult =
  | { session: Session; error?: never }
  | { session?: never; error: NextResponse };

/**
 * Require authentication for an API route.
 * Returns the session if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session };
}

/**
 * Require authentication + rate limiting for an API route.
 * Checks rate limit first, then auth. Logs failures to error log.
 */
export async function requireAuthWithRateLimit(
  request: NextRequest
): Promise<AuthResult> {
  // Extract IP for rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const pathname = new URL(request.url).pathname;

  // Check rate limit (if Upstash is configured)
  if (authenticatedLimit) {
    const result = await authenticatedLimit.limit(ip);
    if (!result.success) {
      logRateLimitHit(ip, pathname);
      return {
        error: NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
            },
          }
        ),
      };
    }
  }

  // Check auth
  const session = await auth();
  if (!session?.user?.id) {
    logAuthFailure(pathname, { ip });
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session };
}
