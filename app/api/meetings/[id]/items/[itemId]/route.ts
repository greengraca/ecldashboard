import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateItem, acceptItem } from "@/lib/meetings";
import { meetingItemUpdateSchema } from "@/lib/validation";

export const PATCH = withAuthParams<{ id: string; itemId: string }>(
  async (session, request, { itemId }) => {
    const body = await request.json();
    const parsed = meetingItemUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const userId = session.user!.id!;
    const userName = getUserName(session);

    // If accepting, use acceptItem which creates the actual entity
    if (parsed.data.status === "accepted") {
      const item = await acceptItem(itemId, userId, userName);
      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      return NextResponse.json({ data: item });
    }

    const item = await updateItem(itemId, parsed.data, userId, userName);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ data: item });
  },
  "meetings/[id]/items/[itemId]:PATCH"
);
