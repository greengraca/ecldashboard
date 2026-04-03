import { DISCORD_GUILD_ID, DISCORD_BOT_TOKEN } from "./constants";
import type { DiscordMember } from "./types";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let memberCachePromise: Promise<DiscordMember[]> | null = null;
let memberCacheExpires = 0;

function buildAvatarUrl(userId: string, avatarHash: string | null): string | null {
  if (!avatarHash) return null;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
}

interface DiscordApiMember {
  user?: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    bot?: boolean;
  };
  nick?: string | null;
  roles: string[];
  joined_at: string;
}

async function fetchAllGuildMembers(): Promise<DiscordMember[]> {
  const members: DiscordMember[] = [];
  let after = "0";
  const limit = 1000;

  while (true) {
    const url = `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members?limit=${limit}&after=${after}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Discord API error ${res.status}: ${text}`);
    }

    const batch: DiscordApiMember[] = await res.json();

    for (const m of batch) {
      if (!m.user || m.user.bot) continue;

      members.push({
        id: m.user.id,
        username: m.user.username,
        display_name: m.nick || m.user.global_name || m.user.username,
        avatar_url: buildAvatarUrl(m.user.id, m.user.avatar ?? null),
        roles: m.roles,
        joined_at: m.joined_at,
      });
    }

    if (batch.length < limit) break;
    after = batch[batch.length - 1].user!.id;
  }

  return members;
}

export async function fetchGuildMembers(): Promise<DiscordMember[]> {
  if (memberCachePromise && Date.now() < memberCacheExpires) {
    return memberCachePromise;
  }

  memberCacheExpires = Date.now() + CACHE_TTL;
  memberCachePromise = fetchAllGuildMembers().catch((err) => {
    // On failure, clear the cached promise so next call retries
    memberCachePromise = null;
    memberCacheExpires = 0;
    throw err;
  });
  return memberCachePromise;
}

export function clearMemberCache(): void {
  memberCachePromise = null;
  memberCacheExpires = 0;
}
