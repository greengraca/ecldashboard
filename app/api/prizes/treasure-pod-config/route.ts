import { NextRequest, NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getTreasurePodConfig, upsertTreasurePodConfig } from "@/lib/treasure-pod-config";
import { treasurePodConfigSchema } from "@/lib/validation";

export const GET = withAuthRead(async (request) => {
  const month = request.nextUrl.searchParams.get("month");
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const data = await getTreasurePodConfig(month);
  return NextResponse.json({ data });
}, "prizes/treasure-pod-config:GET");

export const PUT = withAuth(async (session, request) => {
  const body = await request.json();
  const { month, ...rest } = body;
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const parsed = treasurePodConfigSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const data = await upsertTreasurePodConfig(
    month,
    parsed.data,
    user.discord_id,
    user.name
  );

  return NextResponse.json({ data });
}, "prizes/treasure-pod-config:PUT");
