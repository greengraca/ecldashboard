import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateFixedCost, deleteFixedCost } from "@/lib/finance";

export const PATCH = withAuth(async (session, request) => {
  const id = request.nextUrl.pathname.split("/").pop()!;
  const body = await request.json();
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await updateFixedCost(id, body, userId, userName);
  return NextResponse.json({ data: { success: true } });
}, "finance/fixed-costs/[id]:PATCH");

export const DELETE = withAuth(async (session, request) => {
  const id = request.nextUrl.pathname.split("/").pop()!;
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await deleteFixedCost(id, userId, userName);
  return NextResponse.json({ data: { success: true } });
}, "finance/fixed-costs/[id]:DELETE");
