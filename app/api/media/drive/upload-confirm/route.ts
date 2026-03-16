import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headR2Object } from "@/lib/r2";
import { createFileMetadata } from "@/lib/media-drive";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { r2Key, name, parentId, size, mimeType } = body;

    if (!r2Key || !name || !mimeType) {
      return NextResponse.json(
        { error: "r2Key, name, and mimeType are required" },
        { status: 400 }
      );
    }

    // Verify the object actually exists in R2
    const exists = await headR2Object(r2Key);
    if (!exists) {
      return NextResponse.json(
        { error: "R2 object not found — upload may have failed" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    const metadata = await createFileMetadata({
      name,
      parentId: parentId || null,
      mimeType,
      size: size || 0,
      r2Key,
      uploadedBy: userName,
    });

    return NextResponse.json({ data: metadata }, { status: 201 });
  } catch (err) {
    console.error("POST /api/media/drive/upload-confirm error:", err);
    return NextResponse.json(
      { error: "Failed to confirm upload" },
      { status: 500 }
    );
  }
}
