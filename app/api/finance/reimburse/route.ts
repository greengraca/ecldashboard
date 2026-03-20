import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";
import { reimburseExpense, unreimburseExpense } from "@/lib/finance";

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const body = await request.json();
    const { id, source, reimbursed } = body;

    if (!id || !source || typeof reimbursed !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: id, source, reimbursed" },
        { status: 400 }
      );
    }

    if (source !== "transaction" && source !== "fixed_cost") {
      return NextResponse.json(
        { error: "source must be 'transaction' or 'fixed_cost'" },
        { status: 400 }
      );
    }

    const userId = session!.user!.id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session!.user as any).username || session!.user!.name || "unknown";

    if (reimbursed) {
      await reimburseExpense(id, source, userId, userName);
    } else {
      await unreimburseExpense(id, source, userId, userName);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("POST /api/finance/reimburse error:", err);
    logApiError("finance/reimburse:POST", err);
    return NextResponse.json(
      { error: "Failed to update reimbursement" },
      { status: 500 }
    );
  }
}
