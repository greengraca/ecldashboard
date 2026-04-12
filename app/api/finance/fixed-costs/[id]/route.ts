import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateFixedCost, deleteFixedCost } from "@/lib/finance";

export const PATCH = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const body = await request.json();
  const userId = session.user!.id!;
  const userName = getUserName(session);

  const { effective_month, ...data } = body;
  await updateFixedCost(id, data, userId, userName, effective_month);
  return NextResponse.json({ data: { success: true } });
}, "finance/fixed-costs/[id]:PATCH");

export const DELETE = withAuthParams<{ id: string }>(async (session, _request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await deleteFixedCost(id, userId, userName);
  return NextResponse.json({ data: { success: true } });
}, "finance/fixed-costs/[id]:DELETE");
