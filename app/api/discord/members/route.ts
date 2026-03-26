import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { fetchGuildMembers } from "@/lib/discord";

export const GET = withAuthRead(async (_request) => {
  const members = await fetchGuildMembers();
  return NextResponse.json({ data: members });
}, "discord/members:GET");
