import { NextRequest, NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getPrizes, createPrize } from "@/lib/prizes";
import { prizeCreateSchema } from "@/lib/validation";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const prizes = await getPrizes(month);
  return NextResponse.json({ data: prizes });
}, "prizes:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const parsed = prizeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { month, category, name, value, recipient_type, recipient_name } = parsed.data;

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const prize = await createPrize(
    {
      month,
      category,
      name,
      description: parsed.data.description || "",
      image_url: parsed.data.image_url || null,
      value: Number(value),
      recipient_type,
      placement: parsed.data.placement ?? null,
      recipient_uid: parsed.data.recipient_uid || null,
      recipient_name,
      recipient_discord_id: parsed.data.recipient_discord_id || null,
      shipping_status: parsed.data.shipping_status || "pending",
      status: parsed.data.status || "planned",
    },
    userId,
    userName
  );

  return NextResponse.json({ data: prize }, { status: 201 });
}, "prizes:POST");
