import { NextRequest, NextResponse } from "next/server";
import { getUserName } from "@/lib/auth";
import { withAuth } from "@/lib/api-helpers";
import { randomUUID } from "crypto";
import { uploadToR2 } from "@/lib/r2";
import { createFileMetadata, ensureFolder } from "@/lib/media-drive";
import { generateAndStoreThumbnail } from "@/lib/thumbnails";
import { validateFileExtension, sanitizeFilename } from "@/lib/validation";
import type { Session } from "next-auth";

export const POST = withAuth(async (session: Session, request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folderName = formData.get("folder") as string | null;
  const rawParentId = (formData.get("parentId") as string) || null;
  const userName = getUserName(session);

  // If a folder name is provided, ensure it exists at root and use its ID
  const parentId = folderName
    ? await ensureFolder(folderName.trim(), userName)
    : rawParentId;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file extension
  const extError = validateFileExtension(file.name);
  if (extError) {
    return NextResponse.json({ error: extError }, { status: 400 });
  }

  // 4MB limit for server-side proxy
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json(
      {
        error:
          "File too large for direct upload. Use presigned URL flow for files >= 4MB.",
      },
      { status: 413 }
    );
  }

  const safeName = sanitizeFilename(file.name);
  const r2Key = `media/${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadToR2(r2Key, buffer, file.type || "application/octet-stream");

  // Generate thumbnail eagerly for image uploads (buffer already in memory)
  let thumbR2Key: string | undefined;
  if (file.type?.startsWith("image/")) {
    try {
      thumbR2Key = await generateAndStoreThumbnail(r2Key, buffer);
    } catch (err) {
      console.warn("Thumbnail generation failed, will retry lazily:", err);
    }
  }

  const metadata = await createFileMetadata({
    name: file.name,
    parentId,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    r2Key,
    thumbR2Key,
    uploadedBy: userName,
  });

  return NextResponse.json({ data: metadata }, { status: 201 });
}, "media/drive/upload:POST");
