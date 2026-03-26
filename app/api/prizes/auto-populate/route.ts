import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { autoPopulatePrizes } from "@/lib/prizes";
import { getCurrentMonth } from "@/lib/utils";

export const POST = withAuth(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const created = await autoPopulatePrizes(month, userId, userName);
  return NextResponse.json({ data: { created } });
}, "prizes/auto-populate:POST");
