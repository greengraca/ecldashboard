import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateTransaction, deleteTransaction } from "@/lib/finance";
import { transactionUpdateSchema } from "@/lib/validation";

export const PATCH = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const body = await request.json();
  const parsed = transactionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await updateTransaction(id, parsed.data, userId, userName);
  return NextResponse.json({ data: { success: true } });
}, "finance/transactions/[id]:PATCH");

export const DELETE = withAuthParams<{ id: string }>(async (session, _request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await deleteTransaction(id, userId, userName);
  return NextResponse.json({ data: { success: true } });
}, "finance/transactions/[id]:DELETE");
