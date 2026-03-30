import { NextResponse } from "next/server";

export const unstable_maxDuration = 60;

import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { setFile } from "@/lib/dragon-shield";
import { uploadToR2 } from "@/lib/r2";
import { generateAndStorePreview } from "@/lib/thumbnails";
import { ensureDriveEntry } from "@/lib/media-drive";

export const POST = withAuth(async (session, request) => {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const month = formData.get("month") as string | null;
  const fileType = formData.get("fileType") as "sleeve" | "playmat" | null;
  const tier = formData.get("tier") as string | null;

  if (!file || !month || !fileType || !tier) {
    return NextResponse.json({ error: "file, month, fileType, and tier are required" }, { status: 400 });
  }

  const validSleeveTiers = ["champion", "top4", "top16"];
  const validPlaymatTiers = ["champion", "top4"];
  const validTiers = fileType === "sleeve" ? validSleeveTiers : validPlaymatTiers;
  if (!validTiers.includes(tier)) {
    return NextResponse.json({ error: `Invalid tier for ${fileType}: ${tier}` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const r2Key = `dragon-shield/${month}/${fileType}-${tier}-${file.name}`;
  await uploadToR2(r2Key, buffer, file.type);

  // Generate mid-res preview for faster loading
  let previewR2Key: string | undefined;
  if (file.type?.startsWith("image/")) {
    try {
      previewR2Key = await generateAndStorePreview(r2Key, buffer);
    } catch {
      // Non-fatal
    }
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  // Create media drive entry in Prizes/Sleeves/{month} or Prizes/Playmats/{month}
  const driveFolder = fileType === "sleeve"
    ? `Prizes/Sleeves/${month}`
    : `Prizes/Playmats/${month}`;
  try {
    await ensureDriveEntry({
      r2Key,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      folder: driveFolder,
      uploadedBy: userName,
    });
  } catch {
    // Non-fatal
  }
  const result = await setFile(
    month,
    fileType,
    tier,
    { r2_key: r2Key, preview_r2_key: previewR2Key || null, filename: file.name, uploaded_at: new Date().toISOString() },
    userId,
    userName
  );

  return NextResponse.json({ data: result });
}, "prizes/dragon-shield/files:POST");
