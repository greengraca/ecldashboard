import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { loadCodes, deleteCodes } from "@/lib/dragon-shield";
import { getEligibleTop16 } from "@/lib/players";
import { getDb } from "@/lib/mongodb";
import { getCurrentMonth } from "@/lib/utils";

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const { codes, month: bodyMonth } = body;
  const { searchParams } = new URL(request.url);
  const month = bodyMonth || searchParams.get("month") || getCurrentMonth();

  if (!Array.isArray(codes) || codes.length === 0) {
    return NextResponse.json({ error: "codes must be a non-empty array" }, { status: 400 });
  }

  // Get bracket results (Top 4 cut) and Swiss standings
  const [bracketResults, swissTop16] = await Promise.all([
    getDb().then((db) => db.collection("dashboard_bracket_results").findOne({ month })),
    getEligibleTop16(month),
  ]);

  const swissMap = new Map(swissTop16.map((p) => [p.uid, p.name]));

  // Build ordered list: Top 4 from bracket results first, then remaining Swiss for 5-16
  const top4Order: string[] = bracketResults?.top4_order || [];
  const top4Set = new Set(top4Order);

  const ordered: { uid: string; name: string }[] = [];

  // Positions 1-4: from bracket results (top4_order is already in placement order)
  for (const uid of top4Order) {
    ordered.push({ uid, name: swissMap.get(uid) || uid });
  }

  // Positions 5-16: remaining Swiss standings players not in Top 4
  for (const player of swissTop16) {
    if (ordered.length >= 16) break;
    if (!top4Set.has(player.uid)) {
      ordered.push(player);
    }
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);
  const result = await loadCodes(month, codes, ordered, userId, userName);
  return NextResponse.json({ data: result });
}, "prizes/dragon-shield/codes:POST");

export const DELETE = withAuth(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const userId = session!.user!.id!;
  const userName = getUserName(session!);
  const result = await deleteCodes(month, userId, userName);
  return NextResponse.json({ data: result });
}, "prizes/dragon-shield/codes:DELETE");
