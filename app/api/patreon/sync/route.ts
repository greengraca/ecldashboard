import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { syncPatreonForMonth } from "@/lib/patreon";
import { getCurrentMonth } from "@/lib/utils";

export const POST = withAuth(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const result = await syncPatreonForMonth(month, userId, userName);
  return NextResponse.json({ data: result });
}, "patreon/sync:POST");
