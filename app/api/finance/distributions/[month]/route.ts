import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { undoDistribution } from "@/lib/distributions";

export const DELETE = withAuthParams<{ month: string }>(async (session, _request, { month }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);
  await undoDistribution(month, userId, userName);
  return NextResponse.json({ data: { success: true } });
}, "finance/distributions/[month]:DELETE");
