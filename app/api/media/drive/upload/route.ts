import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { uploadToR2 } from "@/lib/r2";
import { createFileMetadata } from "@/lib/media-drive";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parentId = (formData.get("parentId") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    const r2Key = `media/${randomUUID()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadToR2(r2Key, buffer, file.type || "application/octet-stream");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    const metadata = await createFileMetadata({
      name: file.name,
      parentId,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      r2Key,
      uploadedBy: userName,
    });

    return NextResponse.json({ data: metadata }, { status: 201 });
  } catch (err) {
    console.error("POST /api/media/drive/upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
