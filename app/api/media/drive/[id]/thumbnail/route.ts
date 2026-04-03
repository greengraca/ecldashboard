import { NextRequest, NextResponse } from "next/server";
import { withAuthReadParams } from "@/lib/api-helpers";
import { getItem } from "@/lib/media-drive";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { generateAndStoreThumbnail } from "@/lib/thumbnails";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const GET = withAuthReadParams<{ id: string }>(async (_request, { id }) => {
  const item = await getItem(id);

  if (!item || item.type !== "file" || !item.r2Key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!item.mimeType?.startsWith("image/")) {
    return NextResponse.json(
      { error: "Not an image" },
      { status: 400 }
    );
  }

  // If thumbnail already exists, redirect to it
  if (item.thumbR2Key) {
    const url = await getPresignedDownloadUrl(item.thumbR2Key, 86400);
    return NextResponse.redirect(url, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // Generate thumbnail lazily
  const thumbR2Key = await generateAndStoreThumbnail(item.r2Key);

  // Store thumb key + get presigned URL in parallel
  const db = await getDb();
  const [, url] = await Promise.all([
    db.collection("dashboard_media_files").updateOne(
      { _id: new ObjectId(id) },
      { $set: { thumbR2Key, updatedAt: new Date() } }
    ),
    getPresignedDownloadUrl(thumbR2Key, 86400),
  ]);
  return NextResponse.redirect(url, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}, "media/drive/[id]/thumbnail:GET");
