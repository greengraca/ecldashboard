import { NextRequest, NextResponse } from "next/server";
import { getMonthlyConfig, autoFillMostGamesImage } from "@/lib/monthly-config";
import { getCurrentMonth } from "@/lib/utils";

// Public endpoint consumed by eclBot (/mostgames embed).
// Returns the canonical Most Games prize image URL for a month:
//   1. ecl_monthly_config.mostgames_prize_image_url (admin override)
//   2. dashboard_prizes.image_url for recipient_type="most_games"
//   3. presigned URL from dashboard_prizes.r2_key
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const config = await getMonthlyConfig(month);
  let url: string | null = config?.mostgames_prize_image_url ?? null;
  if (!url) url = await autoFillMostGamesImage(month);

  return NextResponse.json({ data: { month, url } });
}
