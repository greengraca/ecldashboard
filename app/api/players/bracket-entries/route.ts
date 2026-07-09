import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getBracketIdForMonth } from "@/lib/bracket-ids";
import { fetchLiveStandings } from "@/lib/topdeck-live";
import { getHistoricalMonths, reassembleMonthDump } from "@/lib/topdeck";
import {
  computeBracketEntriesByDay,
  type EntryPod,
} from "@/lib/bracket-entries";
import { getCurrentMonth } from "@/lib/utils";

// GET /api/players/bracket-entries?month=YYYY-MM
// Per-day bracket entries (new-entrant bars + cumulative line). A player enters on
// the day of their first game — the only entry signal in TopDeck data. Current
// month reads live standings; past months read the month dump.
export const GET = withAuthRead(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const isCurrentMonth = month === getCurrentMonth();

  const pods = isCurrentMonth
    ? await currentMonthPods()
    : await pastMonthPods(month);

  const result = computeBracketEntriesByDay(pods, month);
  return NextResponse.json({ data: result });
}, "players/bracket-entries:GET");

async function currentMonthPods(): Promise<EntryPod[]> {
  const bid = await getBracketIdForMonth(getCurrentMonth());
  if (!bid) return [];
  const live = await fetchLiveStandings(bid);
  return live.gamePods.map((p) => ({
    start: p.startTime,
    uids: p.players.map((x) => x.uid),
  }));
}

async function pastMonthPods(month: string): Promise<EntryPod[]> {
  const months = await getHistoricalMonths();
  const monthInfo = months.find((m) => m.month === month);
  if (!monthInfo) return [];

  const dump = await reassembleMonthDump(monthInfo);
  return dump.matches.map((m) => ({
    start: m.start,
    uids: m.es.map((eid) => dump.entrant_to_uid[String(eid)] ?? String(eid)),
  }));
}
