import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { assignCard } from "@/lib/card-inventory";
import { inventoryAssignSchema } from "@/lib/validation";

export const POST = withAuthParams<{ id: string }>(
  async (session, request: NextRequest, { id }) => {
    const body = await request.json();
    const parsed = inventoryAssignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const userId = session!.user!.id!;
    const userName = getUserName(session!);

    try {
      const result = await assignCard(id, parsed.data, userId, userName);
      return NextResponse.json({ data: result }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Assignment failed";
      if (
        message === "Inventory card not found" ||
        message === "Card is not available for assignment"
      ) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw err;
    }
  },
  "inventory-assign:POST"
);
