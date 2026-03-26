import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getAllRates, createRate } from "@/lib/subscription-rates";

export const GET = withAuthRead(async () => {
  const rates = await getAllRates();
  return NextResponse.json({ data: rates });
}, "finance/subscription-rates:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const { effective_from, patreon_net, kofi_net, manual_net } = body;

  if (
    !effective_from ||
    patreon_net == null ||
    kofi_net == null ||
    manual_net == null
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const userId = session.user!.id!;
  const userName = getUserName(session);

  const rate = await createRate(
    {
      effective_from,
      patreon_net: Number(patreon_net),
      kofi_net: Number(kofi_net),
      manual_net: Number(manual_net),
    },
    userId,
    userName
  );

  return NextResponse.json({ data: rate }, { status: 201 });
}, "finance/subscription-rates:POST");
