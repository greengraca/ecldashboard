import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";
import { withAuthRead } from "@/lib/api-helpers";
import { REQUIRED_ASSETS } from "@/components/media/shared/brand-constants";
import { checkAssetStatus } from "@/lib/media-drive";

export const GET = withAuthRead(async () => {
  const requiredNames = REQUIRED_ASSETS.map(
    (a) => a.path.split("/").pop()!
  );

  // Check drive (MongoDB)
  const driveStatus = await checkAssetStatus(requiredNames);

  // Check repo (public/ folder on disk)
  const results = REQUIRED_ASSETS.map((asset, i) => {
    const inDrive = driveStatus[i].exists;
    const inRepo = existsSync(join(process.cwd(), "public", asset.path));
    return {
      key: asset.key,
      label: asset.label,
      path: asset.path,
      exists: inRepo || inDrive,
      source: inRepo ? "repo" : inDrive ? "drive" : null,
    };
  });

  return NextResponse.json({ data: results });
}, "media/drive/asset-status:GET");
