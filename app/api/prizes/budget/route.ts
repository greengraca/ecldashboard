import { NextRequest, NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getPrizeBudget, upsertPrizeBudget } from "@/lib/prizes";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const budget = await getPrizeBudget(month);
  return NextResponse.json({ data: budget });
}, "prizes/budget:GET");

export const PUT = withAuth(async (session, request) => {
  const body = await request.json();
  const { month, total_budget, allocations, notes } = body;

  if (!month || total_budget == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const budget = await upsertPrizeBudget(
    month,
    { total_budget: Number(total_budget), allocations: allocations || {}, notes: notes || "" },
    userId,
    userName
  );

  return NextResponse.json({ data: budget });
}, "prizes/budget:PUT");
