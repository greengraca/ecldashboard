import { NextRequest, NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getOrders, createOrder } from "@/lib/card-inventory";
import { cardOrderCreateSchema } from "@/lib/validation";

export const GET = withAuthRead(async () => {
  const orders = await getOrders();
  return NextResponse.json({ data: orders });
}, "inventory-orders:GET");

export const POST = withAuth(async (session, request: NextRequest) => {
  const body = await request.json();
  const parsed = cardOrderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const result = await createOrder(parsed.data, userId, userName);

  return NextResponse.json({ data: result }, { status: 201 });
}, "inventory-orders:POST");
