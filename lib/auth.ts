import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Discord from "next-auth/providers/discord";
import { isAllowedDiscordId } from "./constants";

declare module "next-auth" {
  interface User {
    username?: string;
    discordId?: string;
  }
}

export function getUserName(session: Session): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session.user as any).username || session.user?.name || "unknown";
}

export const discordProvider = Discord({
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  // Discord appends `iss` to the OAuth redirect (RFC 9207). The built-in provider
  // sets no issuer, so Auth.js falls back to "https://authjs.dev" and rejects the
  // callback as error=Configuration. Covered by scripts/verify-discord-issuer.ts.
  issuer: "https://discord.com",
  authorization: {
    params: {
      scope: "identify guilds",
    },
  },
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [discordProvider],
  callbacks: {
    async signIn({ account }) {
      // Fail-closed allowlist — see isAllowedDiscordId in lib/constants.ts.
      return isAllowedDiscordId(account?.providerAccountId);
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = account.providerAccountId;
        token.username = (profile as Record<string, unknown>).username as string;
        token.avatar = (profile as Record<string, unknown>).avatar as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.discordId as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).username = token.username;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).discordId = token.discordId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
