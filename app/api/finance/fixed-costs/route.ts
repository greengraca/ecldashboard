import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";
import { getFixedCosts, createFixedCost } from "@/lib/finance";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthWithRateLimit(request);
    if (error) return error;
    const fixedCosts = await getFixedCosts();
    return NextResponse.json({ data: fixedCosts });
  } catch (err) {
    console.error("GET /api/finance/fixed-costs error:", err);
    logApiError("finance/fixed-costs:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch fixed costs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const body = await request.json();
    const { name, amount, category, active, start_month, end_month, paid_by } = body;

    if (!name || amount == null || !category || !start_month) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = session!.user!.id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session!.user as any).username || session!.user!.name || "unknown";

    const fixedCost = await createFixedCost(
      {
        name,
        amount: Number(amount),
        category,
        active: active ?? true,
        start_month,
        end_month: end_month || null,
        paid_by: paid_by || null,
      },
      userId,
      userName
    );

    return NextResponse.json({ data: fixedCost }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finance/fixed-costs error:", err);
    logApiError("finance/fixed-costs:POST", err);
    return NextResponse.json(
      { error: "Failed to create fixed cost" },
      { status: 500 }
    );
  }
}
