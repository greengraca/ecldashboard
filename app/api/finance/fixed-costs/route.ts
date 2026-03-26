import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getFixedCosts, createFixedCost } from "@/lib/finance";

export const GET = withAuthRead(async () => {
  const fixedCosts = await getFixedCosts();
  return NextResponse.json({ data: fixedCosts });
}, "finance/fixed-costs:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const { name, amount, category, active, start_month, end_month, paid_by } = body;

  if (!name || amount == null || !category || !start_month) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const userId = session.user!.id!;
  const userName = getUserName(session);

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
}, "finance/fixed-costs:POST");
