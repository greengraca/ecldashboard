import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Discord from "next-auth/providers/discord";
import { ALLOWED_DISCORD_IDS } from "./constants";

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify guilds",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (!account?.providerAccountId) return false;
      const discordId = parseInt(account.providerAccountId, 10);
      if (ALLOWED_DISCORD_IDS.size === 0) return true;
      return ALLOWED_DISCORD_IDS.has(discordId);
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
