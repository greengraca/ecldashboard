import { NextResponse } from "next/server";
import { auth } from "./auth";
import type { Session } from "next-auth";

/**
 * Require authentication for an API route.
 * Returns the session if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth(): Promise<
  { session: Session; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session };
}
