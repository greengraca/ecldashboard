import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncPatreonForMonth } from "@/lib/patreon";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    const result = await syncPatreonForMonth(month, userId, userName);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("POST /api/patreon/sync error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to sync Patreon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
