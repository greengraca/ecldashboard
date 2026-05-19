import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { TEAM_MEMBERS } from "@/lib/constants";
import { getAllMappings } from "@/lib/user-mapping";

/**
 * Returns the list of TEAM_MEMBERS (the hardcoded finance roster) that don't
 * yet have a corresponding row in dashboard_user_mapping. Match is by
 * case-insensitive display_name. Settings UI uses this to surface a
 * "Missing user mapping" banner so finance/meetings stay in sync.
 */
export const GET = withAuthRead(async () => {
  const mappings = await getAllMappings();
  const mappedNames = new Set(
    mappings.map((m) => m.display_name.toLowerCase().trim())
  );

  const missing = TEAM_MEMBERS.filter(
    (tm) => !mappedNames.has(tm.name.toLowerCase().trim())
  ).map((tm) => ({ id: tm.id, name: tm.name, group: tm.group }));

  return NextResponse.json({ data: missing });
}, "team-members/drift:GET");
