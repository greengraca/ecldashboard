import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { fetchLiveStandings } from "@/lib/topdeck-live";
import { fetchGuildMembers } from "@/lib/discord";
import { isTop16Eligible } from "@/lib/top16-eligibility";
import { getBracketIdForMonth } from "@/lib/bracket-ids";
import { getCurrentMonth } from "@/lib/utils";
import type { LiveStanding } from "@/lib/types";

export const GET = withAuthRead(async () => {
  const month = getCurrentMonth();
  const bracketId = await getBracketIdForMonth(month);

  const [liveResult, guildMembers] = await Promise.all([
    fetchLiveStandings(bracketId),
    fetchGuildMembers(),
  ]);

  // Build discord username → avatar_url lookup
  const avatarByUsername = new Map<string, string>();
  for (const m of guildMembers) {
    if (m.avatar_url) {
      avatarByUsername.set(m.username.toLowerCase(), m.avatar_url);
      avatarByUsername.set(m.display_name.toLowerCase(), m.avatar_url);
    }
  }

  // Build standings with eligibility via the shared predicate (always current month → new rule)
  let rank = 0;
  const standings: LiveStanding[] = liveResult.rows.map((r) => {
    rank++;
    const eligible = isTop16Eligible({
      month,
      dropped: r.dropped,
      totalGames: r.games,
      onlineGames: 0, // ignored by the total-games rule
    });

    const discordLower = r.discord?.toLowerCase().trim() || "";
    const avatar = avatarByUsername.get(discordLower) || null;

    return {
      rank,
      uid: r.uid || r.entrant_id.toString(),
      name: r.name,
      discord: r.discord,
      avatar_url: avatar,
      points: r.points,
      games: r.games,
      wins: r.wins,
      losses: r.losses,
      draws: r.draws,
      win_pct: r.win_pct,
      ow_pct: r.ow_pct,
      dropped: r.dropped,
      eligible,
    };
  });

  return NextResponse.json({
    data: {
      standings,
      total_matches: liveResult.totalMatches,
      in_progress: liveResult.inProgress,
      voided: liveResult.voided,
      bracket_id: bracketId,
    },
  });
}, "players/standings/live:GET");
