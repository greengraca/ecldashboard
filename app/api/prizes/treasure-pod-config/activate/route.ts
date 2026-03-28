import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { activateTreasurePodConfig } from "@/lib/treasure-pod-config";

export const POST = withAuth(async (session, request) => {
  const { month } = await request.json();
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const data = await activateTreasurePodConfig(month, user.discord_id, user.name);

  if (!data) {
    return NextResponse.json({ error: "No config found for this month" }, { status: 404 });
  }

  return NextResponse.json({ data });
}, "prizes/treasure-pod-config/activate:POST");
