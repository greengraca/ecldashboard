import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { markCodeSent } from "@/lib/dragon-shield";

export const PATCH = withAuthParams<{ index: string }>(async (session, request, { index: indexStr }) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const index = parseInt(indexStr, 10);
  if (isNaN(index) || index < 0 || index > 15) {
    return NextResponse.json({ error: "Invalid index" }, { status: 400 });
  }

  // Support toggling: body may contain { sent: false } to unsend
  let sent = true;
  try {
    const body = await request.json();
    if (body.sent === false) sent = false;
  } catch {
    // No body = mark as sent (backwards compatible)
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);
  const result = await markCodeSent(month, index, sent, userId, userName);
  if (!result) {
    return NextResponse.json({ error: "Dragon Shield doc not found" }, { status: 404 });
  }
  return NextResponse.json({ data: result });
}, "prizes/dragon-shield/codes/sent:PATCH");
