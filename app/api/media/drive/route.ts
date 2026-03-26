import { NextRequest, NextResponse } from "next/server";
import { getUserName } from "@/lib/auth";
import { withAuthRead, withAuth } from "@/lib/api-helpers";
import {
  listFolder,
  createFolder,
  getBreadcrumbs,
  getFolderPreviews,
} from "@/lib/media-drive";
import { getPresignedDownloadUrl } from "@/lib/r2";
import type { Session } from "next-auth";

export const GET = withAuthRead(async (request: NextRequest) => {
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
          // Prefer thumbnail URL; fall back to lazy thumbnail endpoint
          const previewUrl = item.thumbR2Key
            ? await getPresignedDownloadUrl(item.thumbR2Key, 3600)
            : `/api/media/drive/${item._id}/thumbnail`;
          return { ...item, previewUrl };
        } catch {
          return item;
        }
      }
      // Attach folder preview URLs
      if (item.type === "folder") {
        const previewItems = folderPreviewKeys[item._id] || [];
        if (previewItems.length > 0) {
          try {
            const folderPreviews = await Promise.all(
              previewItems.map((pi) => {
                // Prefer thumbnail key, fall back to lazy endpoint
                if (pi.thumbR2Key) {
                  return getPresignedDownloadUrl(pi.thumbR2Key, 3600);
                }
                return Promise.resolve(
                  `/api/media/drive/${pi._id}/thumbnail`
                );
              })
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
}, "media/drive:GET");

export const POST = withAuth(async (session: Session, request: NextRequest) => {
  const body = await request.json();
  const { name, parentId } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Folder name is required" },
      { status: 400 }
    );
  }

  const userName = getUserName(session);
  const folder = await createFolder(name.trim(), parentId || null, userName);

  return NextResponse.json({ data: folder }, { status: 201 });
}, "media/drive:POST");
