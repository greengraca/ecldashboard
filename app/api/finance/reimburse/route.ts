import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { reimburseExpense, unreimburseExpense } from "@/lib/finance";

export const POST = withAuth(async (session, request) => {
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

  const userId = session.user!.id!;
  const userName = getUserName(session);

  if (reimbursed) {
    await reimburseExpense(id, source, userId, userName);
  } else {
    await unreimburseExpense(id, source, userId, userName);
  }

  return NextResponse.json({ data: { success: true } });
}, "finance/reimburse:POST");
