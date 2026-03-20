import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { getPrizeBudget, upsertPrizeBudget } from "@/lib/prizes";

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const budget = await getPrizeBudget(month);
    return NextResponse.json({ data: budget });
  } catch (err) {
    console.error("GET /api/prizes/budget error:", err);
    logApiError("prizes/budget:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session: sess, error: authErr } = await requireAuthWithRateLimit(request);
    if (authErr) return authErr;

    const body = await request.json();
    const { month, total_budget, allocations, notes } = body;

    if (!month || total_budget == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = sess!.user!.id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (sess!.user as any).username || sess!.user!.name || "unknown";

    const budget = await upsertPrizeBudget(
      month,
      { total_budget: Number(total_budget), allocations: allocations || {}, notes: notes || "" },
      userId,
      userName
    );

    return NextResponse.json({ data: budget });
  } catch (err) {
    console.error("PUT /api/prizes/budget error:", err);
    logApiError("prizes/budget:PUT", err);
    return NextResponse.json(
      { error: "Failed to save budget" },
      { status: 500 }
    );
  }
}
