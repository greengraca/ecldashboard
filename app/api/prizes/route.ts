import { NextRequest, NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getPrizes, createPrize } from "@/lib/prizes";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { ensureDriveEntry } from "@/lib/media-drive";
import { prizeCreateSchema } from "@/lib/validation";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const prizes = await getPrizes(month);

  // Resolve r2_key → presigned preview URL for prizes that use R2 images
  const resolved = await Promise.all(
    prizes.map(async (p) => {
      if (p.r2_key && !p.image_url) {
        try {
          const image_url = await getPresignedDownloadUrl(p.r2_key, 3600);
          return { ...p, image_url };
        } catch {
          return p;
        }
      }
      return p;
    })
  );

  return NextResponse.json({ data: resolved });
}, "prizes:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const { r2_upload_meta, ...prizeData } = body;
  const parsed = prizeCreateSchema.safeParse(prizeData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { month, category, name, value, recipient_type, recipient_name } = parsed.data;

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const prize = await createPrize(
    {
      month,
      category,
      name,
      description: parsed.data.description || "",
      image_url: parsed.data.image_url || null,
      r2_key: parsed.data.r2_key || null,
      value: Number(value),
      condition: parsed.data.condition || null,
      card_language: parsed.data.card_language || null,
      set_name: parsed.data.set_name || null,
      recipient_type,
      placement: parsed.data.placement ?? null,
      recipient_uid: parsed.data.recipient_uid || null,
      recipient_name,
      recipient_discord_id: parsed.data.recipient_discord_id || null,
      shipping_status: parsed.data.shipping_status || "pending",
      status: parsed.data.status || "planned",
    },
    userId,
    userName
  );

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
      // Non-fatal — prize was saved, drive entry is a convenience
    }
  }

  return NextResponse.json({ data: prize }, { status: 201 });
}, "prizes:POST");
