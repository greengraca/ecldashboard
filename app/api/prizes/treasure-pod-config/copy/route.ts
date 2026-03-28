import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { copyConfigFromMonth } from "@/lib/treasure-pod-config";

export const POST = withAuth(async (session, request) => {
  const { source_month, target_month } = await request.json();
  if (!source_month || !target_month) {
    return NextResponse.json(
      { error: "source_month and target_month are required" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const data = await copyConfigFromMonth(source_month, target_month, user.discord_id, user.name);

  if (!data) {
    return NextResponse.json({ error: "No config found for source month" }, { status: 404 });
  }

  return NextResponse.json({ data });
}, "prizes/treasure-pod-config/copy:POST");
