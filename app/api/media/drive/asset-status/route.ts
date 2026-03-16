import { NextResponse } from "next/server";
import { REQUIRED_ASSETS } from "@/components/media/shared/brand-constants";
import { checkAssetStatus } from "@/lib/media-drive";

export async function GET() {
  try {
    const requiredNames = REQUIRED_ASSETS.map(
      (a) => a.path.split("/").pop()!
    );
    const status = await checkAssetStatus(requiredNames);

    const results = REQUIRED_ASSETS.map((asset, i) => ({
      key: asset.key,
      label: asset.label,
      path: asset.path,
      exists: status[i].exists,
    }));

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("GET /api/media/drive/asset-status error:", err);
    return NextResponse.json(
      { error: "Failed to check asset status" },
      { status: 500 }
    );
  }
}
