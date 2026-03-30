import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getAllAddresses, upsertPlayerAddress } from "@/lib/player-addresses";

export const GET = withAuthRead(async () => {
  const addresses = await getAllAddresses();
  return NextResponse.json({ data: addresses });
}, "players/addresses:GET");

export const PUT = withAuth(async (session, request) => {
  const body = await request.json();
  const { player_uid, player_name, full_name, street, city, postal_code, country } = body;

  if (!player_uid || !player_name) {
    return NextResponse.json({ error: "player_uid and player_name are required" }, { status: 400 });
  }

  const userId = session!.user!.id!;
  const result = await upsertPlayerAddress(player_uid, {
    player_name,
    full_name: full_name || "",
    street: street || "",
    city: city || "",
    postal_code: postal_code || "",
    country: country || "",
  }, userId);

  return NextResponse.json({ data: result });
}, "players/addresses:PUT");
