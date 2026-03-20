import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";
import { getItem } from "@/lib/media-drive";
import { getPresignedDownloadUrl } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { id } = await params;
    const item = await getItem(id);

    if (!item || item.type !== "file" || !item.r2Key) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const url = await getPresignedDownloadUrl(item.r2Key, 3600);
    return NextResponse.json({ data: { previewUrl: url } });
  } catch (err) {
    console.error("GET /api/media/drive/[id]/preview error:", err);
    logApiError("media/drive/[id]/preview:GET", err);
    return NextResponse.json(
      { error: "Failed to generate preview URL" },
      { status: 500 }
    );
  }
}
