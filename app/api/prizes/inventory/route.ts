import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getInventoryCards, getInventorySummary } from "@/lib/card-inventory";
import type { InventoryCardStatus } from "@/lib/types";

export const GET = withAuthRead(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as InventoryCardStatus | null;

  const filter = status ? { status } : undefined;

  const [cards, summary] = await Promise.all([
    getInventoryCards(filter),
    getInventorySummary(),
  ]);

  return NextResponse.json({ data: cards, summary });
}, "inventory:GET");
