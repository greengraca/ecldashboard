import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { undoFrom } from "@/lib/distributions";

// Roll the distribution watermark back to before `month` (un-settles it and everything after).
export const DELETE = withAuthParams<{ month: string }>(async (session, _request, { month }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);
  const ledger = await undoFrom(month, userId, userName);
  return NextResponse.json({ data: ledger });
}, "finance/distributions/[month]:DELETE");
