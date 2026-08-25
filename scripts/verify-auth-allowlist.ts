/**
 * The dashboard sign-in allowlist must fail CLOSED.
 *
 * It used to `return true` when the allowlist was empty, so an unset or
 * malformed DASHBOARD_ALLOWED_DISCORD_IDS would have let any Discord account
 * into a dashboard holding finances, subscriber PII and player addresses.
 * parseStringSet silently drops non-numeric entries, so "malformed" is a
 * realistic way to reach an empty set — one stray quote is enough.
 *
 * Run: npx tsx scripts/verify-auth-allowlist.ts
 */
import { isAllowedDiscordId } from "../lib/constants";

let failures = 0;
function check(label: string, got: boolean, want: boolean) {
  if (got !== want) { console.error(`FAIL ${label}: got ${got}, want ${want}`); failures++; }
}

const allow = new Set(["123", "456"]);
const empty = new Set<string>();

check("listed id -> allowed", isAllowedDiscordId("123", allow), true);
check("unlisted id -> denied", isAllowedDiscordId("999", allow), false);
check("EMPTY allowlist -> denied (fail closed)", isAllowedDiscordId("123", empty), false);
check("empty allowlist + unknown id -> denied", isAllowedDiscordId("999", empty), false);
check("null id -> denied", isAllowedDiscordId(null, allow), false);
check("undefined id -> denied", isAllowedDiscordId(undefined, allow), false);
check("empty-string id -> denied", isAllowedDiscordId("", allow), false);
check("id is compared exactly, not by prefix", isAllowedDiscordId("1234", allow), false);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("auth allowlist fails closed - OK");
