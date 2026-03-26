import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updatePrize, deletePrize } from "@/lib/prizes";
import { prizeUpdateSchema } from "@/lib/validation";

export const PATCH = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const body = await request.json();
  const parsed = prizeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const userId = session.user!.id!;
  const userName = getUserName(session);

  const prize = await updatePrize(id, parsed.data, userId, userName);
  if (!prize) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }

  return NextResponse.json({ data: prize });
}, "prizes/[id]:PATCH");

export const DELETE = withAuthParams<{ id: string }>(async (session, _request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await deletePrize(id, userId, userName);
  return NextResponse.json({ data: { deleted: true } });
}, "prizes/[id]:DELETE");
