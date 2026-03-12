import { NextRequest, NextResponse } from "next/server";
import { getPlayers } from "@/lib/players";
import { fetchGuildMembers } from "@/lib/discord";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;

    const [{ players, bracket_id }, guildMembers] = await Promise.all([
      getPlayers(month),
      fetchGuildMembers(),
    ]);

    // Fetch PublicPData to get topdeck_uid → discord handle
    let publicPData: Record<string, { name?: string; discord?: string }> = {};
    if (bracket_id) {
      try {
        const res = await fetch(`https://topdeck.gg/PublicPData/${bracket_id}`);
        if (res.ok) publicPData = await res.json();
      } catch { /* ignore */ }
    }

    // Build discord handle → avatar_url from guild members
    const avatarByHandle = new Map<string, string>();
    for (const m of guildMembers) {
      if (m.avatar_url) {
        avatarByHandle.set(m.username.toLowerCase(), m.avatar_url);
        avatarByHandle.set(m.display_name.toLowerCase(), m.avatar_url);
      }
    }

    // Build topdeck_uid → avatar_url via PublicPData discord field
    const avatarByUid = new Map<string, string>();
    for (const [uid, info] of Object.entries(publicPData)) {
      const discord = info?.discord?.toLowerCase().trim();
      if (discord) {
        const avatar = avatarByHandle.get(discord);
        if (avatar) avatarByUid.set(uid, avatar);
      }
    }

    // Enrich players with avatar_url
    const enriched = players.map((p) => ({
      ...p,
      avatar_url: avatarByUid.get(p.uid) || null,
    }));

    return NextResponse.json({ data: { players: enriched, month: month || null, bracket_id } });
  } catch (err) {
    console.error("GET /api/players error:", err);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
