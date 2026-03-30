import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updatePrize, deletePrize } from "@/lib/prizes";
import { ensureDriveEntry } from "@/lib/media-drive";
import { prizeUpdateSchema } from "@/lib/validation";

export const PATCH = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const body = await request.json();
  const { r2_upload_meta, ...updateData } = body;
  const parsed = prizeUpdateSchema.safeParse(updateData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const userId = session.user!.id!;
  const userName = getUserName(session);

  const prize = await updatePrize(id, parsed.data, userId, userName);
  if (!prize) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }

  // Create media drive entry if r2_key was uploaded (deferred from upload)
  if (parsed.data.r2_key && r2_upload_meta) {
    try {
      await ensureDriveEntry({
        r2Key: parsed.data.r2_key,
        name: r2_upload_meta.name,
        size: r2_upload_meta.size,
        mimeType: r2_upload_meta.mimeType,
        thumbR2Key: r2_upload_meta.thumbR2Key,
        folder: "Prizes",
        uploadedBy: userName,
      });
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json({ data: prize });
}, "prizes/[id]:PATCH");

export const DELETE = withAuthParams<{ id: string }>(async (session, _request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await deletePrize(id, userId, userName);
  return NextResponse.json({ data: { deleted: true } });
}, "prizes/[id]:DELETE");
