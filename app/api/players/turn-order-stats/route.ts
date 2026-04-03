import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { TOPDECK_BRACKET_ID, FIRESTORE_DOC_URL_TEMPLATE } from "@/lib/constants";
import { fetchPublicPData } from "@/lib/topdeck-cache";
import { getHistoricalMonths, reassembleMonthDump } from "@/lib/topdeck";
import { computeTurnOrderStats } from "@/lib/turn-order-stats";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const isCurrentMonth = month === getCurrentMonth();

  if (isCurrentMonth) {
    return await handleCurrentMonth();
  } else {
    return await handlePastMonth(month);
  }
}, "players/turn-order-stats:GET");

async function handleCurrentMonth() {
  const bid = TOPDECK_BRACKET_ID;
  if (!bid || !FIRESTORE_DOC_URL_TEMPLATE) {
    return NextResponse.json(
      { error: "TOPDECK_BRACKET_ID or FIRESTORE_DOC_URL_TEMPLATE not configured" },
      { status: 500 }
    );
  }

  const docUrl = FIRESTORE_DOC_URL_TEMPLATE.replace("{bracket_id}", bid);

  const [players, docRes] = await Promise.all([
    fetchPublicPData(bid),
    fetch(docUrl),
  ]);

  if (!docRes.ok) {
    throw new Error(`TopDeck Firestore doc returned ${docRes.status}`);
  }

  const doc = await docRes.json();

  // Parse Firestore fields manually (same logic as topdeck-live.ts)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function fsValueToPy(v: any): any {
    if (v == null) return null;
    if ("nullValue" in v) return null;
    if ("stringValue" in v) return v.stringValue;
    if ("booleanValue" in v) return Boolean(v.booleanValue);
    if ("integerValue" in v) return parseInt(v.integerValue, 10);
    if ("doubleValue" in v) return parseFloat(v.doubleValue);
    if ("arrayValue" in v) return (v.arrayValue?.values || []).map(fsValueToPy);
    if ("mapValue" in v) {
      const fields = v.mapValue?.fields || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out: Record<string, any> = {};
      for (const [k, fv] of Object.entries(fields)) out[k] = fsValueToPy(fv);
      return out;
    }
    return v;
  }

  const rawFields = doc?.fields || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {};
  for (const [k, fv] of Object.entries(rawFields)) {
    fields[k] = fsValueToPy(fv);
  }

  // Extract matches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches: Array<{ season: number; es: number[]; winner: number | string | null; mute?: boolean; end?: number | null }> = [];
  for (const [k, v] of Object.entries(fields)) {
    const m = k.match(/^S(\d+):T(\d+)$/);
    if (!m || typeof v !== "object" || v === null) continue;

    const season = parseInt(m[1], 10);
    const esRaw = v.Es;
    const es: number[] = [];
    if (Array.isArray(esRaw)) {
      for (const x of esRaw) {
        if (typeof x === "number") es.push(x);
        else if (typeof x === "string" && /^\d+$/.test(x)) es.push(parseInt(x, 10));
      }
    }

    matches.push({
      season,
      es,
      winner: v.Winner ?? null,
      mute: v.Mute === true,
    });
  }

  // Extract entrant → uid mapping
  const entrantToUid = new Map<number, string>();
  for (const [k, v] of Object.entries(fields)) {
    const m = k.match(/^E(\d+):P1$/);
    if (m && typeof v === "string" && v) {
      entrantToUid.set(parseInt(m[1], 10), v);
    }
  }

  // Build player names map
  const playerNames = new Map<number, { name: string; discord: string }>();
  for (const [eid, uid] of entrantToUid) {
    const pdata = typeof players === "object" && players !== null ? players[uid] : null;
    playerNames.set(eid, {
      name: pdata?.name || uid || "(unknown)",
      discord: pdata?.discord || "",
    });
  }

  const stats = computeTurnOrderStats(matches, playerNames);
  return NextResponse.json({ data: stats });
}

async function handlePastMonth(month: string) {
  const months = await getHistoricalMonths();
  const monthInfo = months.find((m) => m.month === month);

  if (!monthInfo) {
    // No dump for this month — return empty stats
    return NextResponse.json({
      data: {
        completedPods: 0,
        turnWins: [0, 0, 0, 0],
        turnRates: [0, 0, 0, 0],
        draws: 0,
        drawRate: 0,
        luckiest: null,
        unluckiest: null,
      },
    });
  }

  const [dump, players] = await Promise.all([
    reassembleMonthDump(monthInfo),
    fetchPublicPData(monthInfo.bracket_id).catch(() => ({})),
  ]);
  const playerNames = new Map<number, { name: string; discord: string }>();
  for (const [eidStr, uid] of Object.entries(dump.entrant_to_uid)) {
    const eid = parseInt(eidStr, 10);
    const pdata = typeof players === "object" && players !== null ? (players as Record<string, { name?: string; discord?: string }>)[uid] : null;
    playerNames.set(eid, {
      name: pdata?.name || uid || "(unknown)",
      discord: pdata?.discord || "",
    });
  }

  // DumpMatch has same shape needed by computeTurnOrderStats
  const matches = dump.matches.map((m) => ({
    season: m.season,
    es: m.es,
    winner: m.winner,
  }));

  const stats = computeTurnOrderStats(matches, playerNames);
  return NextResponse.json({ data: stats });
}
