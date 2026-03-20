import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { autoPopulatePrizes } from "@/lib/prizes";

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const userId = session!.user!.id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session!.user as any).username || session!.user!.name || "unknown";

    const created = await autoPopulatePrizes(month, userId, userName);
    return NextResponse.json({ data: { created } });
  } catch (err) {
    console.error("POST /api/prizes/auto-populate error:", err);
    logApiError("prizes/auto-populate:POST", err);
    return NextResponse.json(
      { error: "Failed to auto-populate prizes" },
      { status: 500 }
    );
  }
}
