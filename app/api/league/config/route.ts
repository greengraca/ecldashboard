import { NextRequest, NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getMonthlyConfig, upsertMonthlyConfig, autoFillMostGamesImage } from "@/lib/monthly-config";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const config = await getMonthlyConfig(month);

  // Auto-fill most games image from prizes if not set in config
  let mostgamesImage = config?.mostgames_prize_image_url ?? null;
  if (!mostgamesImage) {
    mostgamesImage = await autoFillMostGamesImage(month);
  }

  // Return config with auto-filled image, or a stub with just the image if no config exists
  const data = config
    ? { ...config, mostgames_prize_image_url: mostgamesImage ?? config.mostgames_prize_image_url }
    : mostgamesImage
    ? { month, mostgames_prize_image_url: mostgamesImage }
    : null;

  return NextResponse.json({ data });
}, "league/config:GET");

export const PUT = withAuth(async (session, request) => {
  const body = await request.json();
  const { month, bracket_id, join_channel_id } = body;

  if (!month) {
    return NextResponse.json(
      { error: "Missing required field: month" },
      { status: 400 }
    );
  }

  const updates: Record<string, string> = {};
  if (bracket_id !== undefined) updates.bracket_id = bracket_id;
  if (join_channel_id !== undefined) updates.join_channel_id = join_channel_id;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const result = await upsertMonthlyConfig(month, updates, userId, userName);
  return NextResponse.json({ data: result });
}, "league/config:PUT");
