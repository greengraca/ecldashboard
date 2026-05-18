import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getFeatureFlags, setFeatureFlag, type FeatureFlags } from "@/lib/feature-flags";

export const GET = withAuthRead(async () => {
  const flags = await getFeatureFlags();
  return NextResponse.json({ data: flags });
}, "feature-flags:GET");

export const PUT = withAuth(async (session, request) => {
  const body = await request.json();
  const { key, value } = body as { key?: keyof FeatureFlags; value?: unknown };

  if (!key) {
    return NextResponse.json({ error: "Missing field: key" }, { status: 400 });
  }
  if (typeof value !== "boolean") {
    return NextResponse.json({ error: "Invalid value: must be boolean" }, { status: 400 });
  }

  // Whitelist allowed flag keys to prevent arbitrary writes
  const allowed: (keyof FeatureFlags)[] = ["lfgelo_enabled"];
  if (!allowed.includes(key)) {
    return NextResponse.json({ error: `Unknown flag: ${key}` }, { status: 400 });
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const flags = await setFeatureFlag(key, value as FeatureFlags[typeof key], userId, userName);
  return NextResponse.json({ data: flags });
}, "feature-flags:PUT");
