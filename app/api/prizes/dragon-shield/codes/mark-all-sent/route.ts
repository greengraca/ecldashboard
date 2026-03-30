import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { markAllCodesSent } from "@/lib/dragon-shield";

export const POST = withAuth(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);
  const result = await markAllCodesSent(month, userId, userName);
  return NextResponse.json({ data: result });
}, "prizes/dragon-shield/codes/mark-all-sent:POST");
