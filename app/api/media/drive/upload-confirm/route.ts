import { NextRequest, NextResponse } from "next/server";
import { getUserName } from "@/lib/auth";
import { withAuth } from "@/lib/api-helpers";
import { headR2Object } from "@/lib/r2";
import { createFileMetadata } from "@/lib/media-drive";
import { validateFileExtension } from "@/lib/validation";
import type { Session } from "next-auth";

export const POST = withAuth(async (session: Session, request: NextRequest) => {
  const body = await request.json();
  const { r2Key, name, parentId, size, mimeType } = body;

  if (!r2Key || !name || !mimeType) {
    return NextResponse.json(
      { error: "r2Key, name, and mimeType are required" },
      { status: 400 }
    );
  }

  const extError = validateFileExtension(name);
  if (extError) {
    return NextResponse.json({ error: extError }, { status: 400 });
  }

  // Verify the object actually exists in R2
  const exists = await headR2Object(r2Key);
  if (!exists) {
    return NextResponse.json(
      { error: "R2 object not found — upload may have failed" },
      { status: 404 }
    );
  }

  const userName = getUserName(session);

  const metadata = await createFileMetadata({
    name,
    parentId: parentId || null,
    mimeType,
    size: size || 0,
    r2Key,
    uploadedBy: userName,
  });

  return NextResponse.json({ data: metadata }, { status: 201 });
}, "media/drive/upload-confirm:POST");
