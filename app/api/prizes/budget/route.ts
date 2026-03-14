import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrizeBudget, upsertPrizeBudget } from "@/lib/prizes";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const budget = await getPrizeBudget(month);
    return NextResponse.json({ data: budget });
  } catch (err) {
    console.error("GET /api/prizes/budget error:", err);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { month, total_budget, allocations, notes } = body;

    if (!month || total_budget == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";

    const budget = await upsertPrizeBudget(
      month,
      { total_budget: Number(total_budget), allocations: allocations || {}, notes: notes || "" },
      userId,
      userName
    );

    return NextResponse.json({ data: budget });
  } catch (err) {
    console.error("PUT /api/prizes/budget error:", err);
    return NextResponse.json(
      { error: "Failed to save budget" },
      { status: 500 }
    );
  }
}
