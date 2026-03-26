import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { markManualPaid, unmarkManualPaid } from "@/lib/manual-payments";

export const POST = withAuthParams<{ discordId: string }>(async (session, request, { discordId }) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month) {
    return NextResponse.json(
      { error: "Missing month parameter" },
      { status: 400 }
    );
  }

  const userId = session.user!.id!;
  const userName = getUserName(session);

  const result = await markManualPaid(month, discordId, userId, userName);
  return NextResponse.json({ data: result }, { status: 201 });
}, "subscribers/[discordId]/manual-payment:POST");

export const DELETE = withAuthParams<{ discordId: string }>(async (session, request, { discordId }) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month) {
    return NextResponse.json(
      { error: "Missing month parameter" },
      { status: 400 }
    );
  }

  const userId = session.user!.id!;
  const userName = getUserName(session);

  await unmarkManualPaid(month, discordId, userId, userName);
  return NextResponse.json({ data: { success: true } });
}, "subscribers/[discordId]/manual-payment:DELETE");
