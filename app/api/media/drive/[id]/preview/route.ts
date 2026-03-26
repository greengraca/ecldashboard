import { NextRequest, NextResponse } from "next/server";
import { withAuthReadParams } from "@/lib/api-helpers";
import { getItem } from "@/lib/media-drive";
import { getPresignedDownloadUrl } from "@/lib/r2";

export const GET = withAuthReadParams<{ id: string }>(async (_request, { id }) => {
  const item = await getItem(id);

  if (!item || item.type !== "file" || !item.r2Key) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const url = await getPresignedDownloadUrl(item.r2Key, 3600);
  return NextResponse.json({ data: { previewUrl: url } });
}, "media/drive/[id]/preview:GET");
