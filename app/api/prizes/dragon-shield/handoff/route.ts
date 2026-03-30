import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { markPlaymatHandoff } from "@/lib/dragon-shield";

export const PATCH = withAuth(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const body = await request.json();
  const handoff = body.handoff !== false;

  const userId = session!.user!.id!;
  const userName = getUserName(session!);
  const result = await markPlaymatHandoff(month, handoff, userId, userName);
  if (!result) {
    return NextResponse.json({ error: "Dragon Shield doc not found" }, { status: 404 });
  }
  return NextResponse.json({ data: result });
}, "prizes/dragon-shield/handoff:PATCH");
