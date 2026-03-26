import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { fetchLiveStandings, type GamePod } from "@/lib/topdeck-live";
import { reassembleMonthDump, getHistoricalMonths } from "@/lib/topdeck";
import { fetchPublicPData } from "@/lib/topdeck-cache";
import { TOPDECK_BRACKET_ID } from "@/lib/constants";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const isCurrentMonth = month === getCurrentMonth();

  if (isCurrentMonth) {
    const result = await fetchLiveStandings();
    return NextResponse.json({ data: result.gamePods });
  }

  // Past month — use dump data
  const months = await getHistoricalMonths(TOPDECK_BRACKET_ID);
  const monthInfo = months.find((m) => m.month === month);
  if (!monthInfo) {
    return NextResponse.json({ data: [] });
  }

  const dump = await reassembleMonthDump(monthInfo);

  // Fetch player names
  let playerData: Record<string, { name?: string; discord?: string }> = {};
  try {
    playerData = await fetchPublicPData(dump.bracket_id);
  } catch (err) { console.warn("TopDeck PublicPData unavailable:", err); }

  // Build GamePod[] from dump matches
  const gamePods: GamePod[] = dump.matches
    .filter((m) => m.es.length >= 2)
    .map((m) => {
      const podPlayers = m.es.map((eid) => {
        const uid = dump.entrant_to_uid[String(eid)] ?? String(eid);
        const pdata = playerData[uid];
        return { uid, name: pdata?.name || uid, discord: pdata?.discord || "" };
      });

      let winner: GamePod["winner"] = null;
      let status: GamePod["status"];

      if (m.end === null) {
        status = "in_progress";
      } else if (m.winner === "_DRAW_") {
        status = "draw";
      } else if (typeof m.winner === "number") {
        status = "completed";
        const wUid = dump.entrant_to_uid[String(m.winner)] ?? String(m.winner);
        const wData = playerData[wUid];
        winner = { uid: wUid, name: wData?.name || wUid };
      } else {
        status = "voided";
      }

      return {
        season: m.season,
        table: m.table,
        players: podPlayers,
        winner,
        status,
        startTime: m.start,
        endTime: m.end,
      };
    });

  return NextResponse.json({ data: gamePods });
}, "players/games:GET");
