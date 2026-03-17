import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listFolder,
  createFolder,
  getBreadcrumbs,
  getFolderPreviews,
} from "@/lib/media-drive";
import { getPresignedDownloadUrl } from "@/lib/r2";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId") || null;

    const items = await listFolder(parentId);

    // Return breadcrumbs for the current folder
    let breadcrumbs: { _id: string; name: string }[] = [];
    if (parentId) {
      breadcrumbs = await getBreadcrumbs(parentId);
    }

    // Batch-generate presigned preview URLs for image files
    const folderIds = items
      .filter((i) => i.type === "folder")
      .map((i) => i._id);
    const [folderPreviewKeys] = await Promise.all([
      getFolderPreviews(folderIds),
    ]);

    const withPreviews = await Promise.all(
      items.map(async (item) => {
        if (
          item.type === "file" &&
          item.r2Key &&
          item.mimeType?.startsWith("image/")
        ) {
          try {
            const previewUrl = await getPresignedDownloadUrl(item.r2Key, 3600);
            return { ...item, previewUrl };
          } catch {
            return item;
          }
        }
        // Attach folder preview URLs
        if (item.type === "folder") {
          const keys = folderPreviewKeys[item._id] || [];
          if (keys.length > 0) {
            try {
              const folderPreviews = await Promise.all(
                keys.map((k) => getPresignedDownloadUrl(k, 3600))
              );
              return { ...item, folderPreviews };
            } catch {
              return item;
            }
          }
        }
        return item;
      })
    );

    return NextResponse.json({ data: withPreviews, breadcrumbs });
  } catch (err) {
    console.error("GET /api/media/drive error:", err);
    return NextResponse.json(
      { error: "Failed to list folder" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";
    const folder = await createFolder(name.trim(), parentId || null, userName);

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (err) {
    console.error("POST /api/media/drive error:", err);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
