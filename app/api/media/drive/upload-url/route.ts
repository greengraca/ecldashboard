import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { getPresignedUploadUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, mimeType, size } = body;

    if (!name || !mimeType) {
      return NextResponse.json(
        { error: "name and mimeType are required" },
        { status: 400 }
      );
    }

    if (size && size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 100MB limit" },
        { status: 413 }
      );
    }

    const r2Key = `media/${randomUUID()}-${name}`;
    const uploadUrl = await getPresignedUploadUrl(r2Key, mimeType, 900);

    return NextResponse.json({ data: { uploadUrl, r2Key } });
  } catch (err) {
    console.error("POST /api/media/drive/upload-url error:", err);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
