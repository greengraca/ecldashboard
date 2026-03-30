import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getDragonShield } from "@/lib/dragon-shield";
import { getPresignedDownloadUrl, headR2Object } from "@/lib/r2";
import { generateAndStorePreview, previewKey } from "@/lib/thumbnails";
import { getDb } from "@/lib/mongodb";
import { getCurrentMonth } from "@/lib/utils";
import type { DragonShieldFile } from "@/lib/types";

async function resolveFilePreview(
  file: DragonShieldFile | null,
  month: string,
  fileType: string,
  tier: string
): Promise<(DragonShieldFile & { preview_url?: string; drive_id?: string }) | null> {
  if (!file) return null;
  try {
    let pvKey = file.preview_r2_key;

    // Lazily generate preview if missing
    if (!pvKey) {
      const candidateKey = previewKey(file.r2_key);
      const exists = await headR2Object(candidateKey);
      if (exists) {
        pvKey = candidateKey;
      } else {
        try {
          pvKey = await generateAndStorePreview(file.r2_key);
        } catch {
          // Fall back to full-res
        }
      }
      // Persist the preview key so we don't regenerate next time
      if (pvKey) {
        const db = await getDb();
        const setKey = `${fileType}_files.${tier}.preview_r2_key`;
        await db.collection("dashboard_dragon_shield").updateOne(
          { month },
          { $set: { [setKey]: pvKey } }
        );
      }
    }

    const preview_url = await getPresignedDownloadUrl(pvKey || file.r2_key, 3600);

    // Look up drive entry ID for download endpoint
    const db = await getDb();
    const driveEntry = await db.collection("dashboard_media_files").findOne({ r2Key: file.r2_key });
    const drive_id = driveEntry?._id?.toString() || undefined;

    return { ...file, preview_url, drive_id, preview_r2_key: pvKey };
  } catch {
    return file;
  }
}

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const data = await getDragonShield(month);

  if (data) {
    // Resolve presigned preview URLs for all uploaded files
    const [sc, s4, s16, pc, p4] = await Promise.all([
      resolveFilePreview(data.sleeve_files?.champion, month, "sleeve", "champion"),
      resolveFilePreview(data.sleeve_files?.top4, month, "sleeve", "top4"),
      resolveFilePreview(data.sleeve_files?.top16, month, "sleeve", "top16"),
      resolveFilePreview(data.playmat_files?.champion, month, "playmat", "champion"),
      resolveFilePreview(data.playmat_files?.top4, month, "playmat", "top4"),
    ]);
    data.sleeve_files = { champion: sc, top4: s4, top16: s16 };
    data.playmat_files = { champion: pc, top4: p4 };
  }

  return NextResponse.json({ data });
}, "prizes/dragon-shield:GET");
