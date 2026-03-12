import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { backfillPatreon, backfillKofi } from "@/lib/backfill";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    const patreonResult = await backfillPatreon(userId, userName);
    const kofiResult = await backfillKofi(userId, userName);

    return NextResponse.json({
      data: { patreon: patreonResult, kofi: kofiResult },
    });
  } catch (err) {
    console.error("POST /api/admin/backfill-subscriptions error:", err);
    const message = err instanceof Error ? err.message : "Backfill failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
