import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateShipping } from "@/lib/prizes";

export const PATCH = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const body = await request.json();
  const userId = session.user!.id!;
  const userName = getUserName(session);

  const prize = await updateShipping(id, body, userId, userName);
  if (!prize) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }

  return NextResponse.json({ data: prize });
}, "prizes/[id]/shipping:PATCH");
