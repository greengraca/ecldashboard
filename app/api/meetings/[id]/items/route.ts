import { NextResponse } from "next/server";
import { withAuthParams, withAuthReadParams } from "@/lib/api-helpers";
import { getItems, createItems } from "@/lib/meetings";

export const GET = withAuthReadParams<{ id: string }>(async (_req, { id }) => {
  const items = await getItems(id);
  return NextResponse.json({ data: items });
}, "meetings/[id]/items:GET");

export const POST = withAuthParams<{ id: string }>(async (_session, request, { id }) => {
  const body = await request.json();

  if (!Array.isArray(body.items)) {
    return NextResponse.json(
      { error: "items must be an array" },
      { status: 400 }
    );
  }

  // Add meeting_id to each item
  const items = body.items.map((item: Record<string, unknown>) => ({
    ...item,
    meeting_id: id,
  }));

  await createItems(id, items);
  return NextResponse.json({ data: { created: items.length } }, { status: 201 });
}, "meetings/[id]/items:POST");
