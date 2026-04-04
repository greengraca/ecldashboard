import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateOrder, deleteOrder } from "@/lib/card-inventory";
import { cardOrderUpdateSchema } from "@/lib/validation";

export const PATCH = withAuthParams<{ id: string }>(
  async (session, request: NextRequest, { id }) => {
    const body = await request.json();
    const parsed = cardOrderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const userId = session!.user!.id!;
    const userName = getUserName(session!);

    const order = await updateOrder(id, parsed.data, userId, userName);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  },
  "inventory-orders:PATCH"
);

export const DELETE = withAuthParams<{ id: string }>(
  async (session, _request: NextRequest, { id }) => {
    const userId = session!.user!.id!;
    const userName = getUserName(session!);

    try {
      await deleteOrder(id, userId, userName);
      return NextResponse.json({ data: { deleted: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      if (message === "Cannot delete order with assigned cards") {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw err;
    }
  },
  "inventory-orders:DELETE"
);
