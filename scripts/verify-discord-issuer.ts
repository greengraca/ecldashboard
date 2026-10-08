/**
 * The Discord provider's `issuer` must match the `iss` Discord sends back.
 *
 * Discord advertises `authorization_response_iss_parameter_supported` (RFC 9207)
 * and appends `iss=https://discord.com` to the OAuth redirect. Auth.js's built-in
 * Discord provider sets no issuer, so it falls back to "https://authjs.dev" and
 * oauth4webapi rejects the callback with `unexpected "iss" (issuer) response
 * parameter value` — which the login flow surfaces as error=Configuration.
 *
 * Fetches Discord's live discovery doc, so it also catches Discord changing its
 * issuer later.
 *
 * Run: npx tsx scripts/verify-discord-issuer.ts
 */
import * as o from "oauth4webapi";
import { discordProvider } from "../lib/auth";

async function main() {
  const res = await fetch("https://discord.com/.well-known/openid-configuration");
  const meta = (await res.json()) as { issuer: string };

  // Same resolution as @auth/core's handleOAuth: user options win, then the
  // provider default, then the authjs.dev fallback.
  const configured =
    discordProvider.options?.issuer ?? discordProvider.issuer ?? "https://authjs.dev";

  const callback = new URL("https://ecldashboard.vercel.app/api/auth/callback/discord");
  callback.searchParams.set("code", "test");
  callback.searchParams.set("iss", meta.issuer);

  try {
    o.validateAuthResponse(
      { issuer: configured },
      { client_id: "test" },
      callback.searchParams,
      o.skipStateCheck
    );
  } catch (e) {
    console.error(`FAIL: Discord sends iss=${meta.issuer}, provider issuer is ${configured}`);
    console.error(`  ${(e as Error).message}`);
    process.exit(1);
  }
  console.log(`Discord issuer matches (${configured}) - OK`);
}

main();
