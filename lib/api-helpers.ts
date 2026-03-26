import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "./api-auth";
import { logApiError } from "./error-log";
import type { Session } from "next-auth";

/**
 * Wraps an API route handler with auth, rate limiting, and error handling.
 * Use for routes that need the session (mutations, activity logging).
 */
export function withAuth(
  handler: (session: Session, req: NextRequest) => Promise<Response>,
  routeName: string
) {
  return async (request: NextRequest) => {
    try {
      const { session, error } = await requireAuthWithRateLimit(request);
      if (error) return error;
      return await handler(session, request);
    } catch (err) {
      console.error(`${routeName} error:`, err);
      logApiError(routeName, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Wraps an API route handler with auth, rate limiting, and error handling.
 * Use for read-only routes that don't need the session object.
 */
export function withAuthRead(
  handler: (req: NextRequest) => Promise<Response>,
  routeName: string
) {
  return async (request: NextRequest) => {
    try {
      const { error } = await requireAuthWithRateLimit(request);
      if (error) return error;
      return await handler(request);
    } catch (err) {
      console.error(`${routeName} error:`, err);
      logApiError(routeName, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
