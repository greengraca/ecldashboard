import { NextRequest, NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getTransactions, createTransaction } from "@/lib/finance";
import { transactionCreateSchema } from "@/lib/validation";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const transactions = await getTransactions(month);
  return NextResponse.json({ data: transactions });
}, "finance/transactions:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const parsed = transactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { date, type, category, description, amount, tags, paid_by } = parsed.data;

  const month = date.substring(0, 7); // "YYYY-MM" from "YYYY-MM-DD"
  const userId = session.user!.id!;
  const userName = getUserName(session);

  const transaction = await createTransaction(
    { month, date, type, category, description, amount: Number(amount), tags: tags || [], paid_by: paid_by || null },
    userId,
    userName
  );

  return NextResponse.json({ data: transaction }, { status: 201 });
}, "finance/transactions:POST");
