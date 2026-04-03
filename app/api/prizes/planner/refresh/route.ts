import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { searchCardsByPriceRange } from "@/lib/scryfall-server";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const minEur = parseFloat(searchParams.get("min_eur") || "0");
  const maxEur = parseFloat(searchParams.get("max_eur") || "0");
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (minEur <= 0 || maxEur <= 0 || maxEur < minEur) {
    return NextResponse.json(
      { error: "Invalid price range" },
      { status: 400 }
    );
  }

  const result = await searchCardsByPriceRange(minEur, maxEur, page);

  return NextResponse.json({
    data: {
      suggestions: result.cards,
      total_results: result.total,
      has_more: result.hasMore,
    },
  });
}, "prizes/planner/refresh:GET");
