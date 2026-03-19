import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAllCaptionTemplates } from "@/lib/caption-templates";

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const templates = await getAllCaptionTemplates();
    return NextResponse.json({ data: templates });
  } catch (err) {
    console.error("GET /api/media/caption-templates error:", err);
    return NextResponse.json(
      { error: "Failed to fetch caption templates" },
      { status: 500 },
    );
  }
}
