import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { backfillPatreon, backfillKofi } from "@/lib/backfill";

export const POST = withAuth(async (session, _request) => {
  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const patreonResult = await backfillPatreon(userId, userName);
  const kofiResult = await backfillKofi(userId, userName);

  return NextResponse.json({
    data: { patreon: patreonResult, kofi: kofiResult },
  });
}, "admin/backfill-subscriptions:POST");
