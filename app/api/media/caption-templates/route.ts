import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";
import { getAllCaptionTemplates } from "@/lib/caption-templates";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const templates = await getAllCaptionTemplates();
    return NextResponse.json({ data: templates });
  } catch (err) {
    console.error("GET /api/media/caption-templates error:", err);
    logApiError("media/caption-templates:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch caption templates" },
      { status: 500 },
    );
  }
}
