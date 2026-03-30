import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { loadCodes } from "@/lib/dragon-shield";
import { getEligibleTop16 } from "@/lib/players";
import { getCurrentMonth } from "@/lib/utils";

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const { codes, month: bodyMonth } = body;
  const { searchParams } = new URL(request.url);
  const month = bodyMonth || searchParams.get("month") || getCurrentMonth();

  if (!Array.isArray(codes) || codes.length === 0) {
    return NextResponse.json({ error: "codes must be a non-empty array" }, { status: 400 });
  }

  const top16 = await getEligibleTop16(month);

  const userId = session!.user!.id!;
  const userName = getUserName(session!);
  const result = await loadCodes(month, codes, top16, userId, userName);
  return NextResponse.json({ data: result });
}, "prizes/dragon-shield/codes:POST");
