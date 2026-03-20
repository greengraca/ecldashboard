import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { logAuthFailure } from "./error-log";
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
 * Require authentication for an API route.
 * Accepts request for future extensibility. Logs auth failures to error log.
 */
export async function requireAuthWithRateLimit(
  request: NextRequest
): Promise<AuthResult> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const pathname = new URL(request.url).pathname;

  const session = await auth();
  if (!session?.user?.id) {
    logAuthFailure(pathname, { ip });
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session };
}
