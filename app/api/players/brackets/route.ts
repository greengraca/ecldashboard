import { NextRequest, NextResponse } from "next/server";
import { withAuthRead, withAuth } from "@/lib/api-helpers";
import { getDb } from "@/lib/mongodb";
import { logActivity } from "@/lib/activity";
import type { Session } from "next-auth";

export const GET = withAuthRead(async (req: NextRequest) => {
  const month = req.nextUrl.searchParams.get("month");
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const db = await getDb();
  const doc = await db.collection("dashboard_bracket_results").findOne({ month });

  return NextResponse.json({
    data: doc
      ? {
          month: doc.month,
          top16_winners: doc.top16_winners || [],
          top4_order: doc.top4_order || [],
          top4_winner: doc.top4_winner || null,
        }
      : null,
  });
}, "players/brackets:GET");

export const PUT = withAuth(async (session: Session, req: NextRequest) => {
  const body = await req.json();
  const { month, top16_winners, top4_order, top4_winner } = body;

  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  if (top16_winners && !Array.isArray(top16_winners)) {
    return NextResponse.json({ error: "top16_winners must be an array" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("dashboard_bracket_results").updateOne(
    { month },
    {
      $set: {
        month,
        top16_winners: top16_winners || [],
        top4_order: top4_order || [],
        top4_winner: top4_winner || null,
        updated_at: new Date().toISOString(),
        updated_by: session!.user!.name || session!.user!.id,
      },
    },
    { upsert: true }
  );

  await logActivity(
    "update",
    "bracket",
    month,
    { top16_winners, top4_order, top4_winner },
    session!.user!.id || "",
    session!.user!.name || ""
  );

  return NextResponse.json({ data: { success: true } });
}, "players/brackets:PUT");
