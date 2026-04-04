import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { unassignCard } from "@/lib/card-inventory";

export const POST = withAuthParams<{ id: string }>(
  async (session, _request: NextRequest, { id }) => {
    const userId = session!.user!.id!;
    const userName = getUserName(session!);

    try {
      const card = await unassignCard(id, userId, userName);
      return NextResponse.json({ data: { card } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unassign failed";
      if (
        message === "Inventory card not found" ||
        message === "Card is not assigned"
      ) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw err;
    }
  },
  "inventory-unassign:POST"
);
