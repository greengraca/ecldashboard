import { NextResponse } from "next/server";
import { withAuthRead, withAuth } from "@/lib/api-helpers";
import { syncPlayerIdentities, getIdentityCount, getAllIdentityMappings } from "@/lib/player-identities";
import { NextRequest } from "next/server";

export const GET = withAuthRead(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("map") === "true") {
    const map = await getAllIdentityMappings();
    return NextResponse.json({ data: map });
  }
  const count = await getIdentityCount();
  return NextResponse.json({ data: { count } });
}, "players/identities:GET");

export const POST = withAuth(async () => {
  const upserted = await syncPlayerIdentities();
  return NextResponse.json({ data: { upserted } });
}, "players/identities:POST");
