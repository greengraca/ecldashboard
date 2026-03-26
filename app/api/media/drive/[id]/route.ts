import { NextRequest, NextResponse } from "next/server";
import { withAuthParams, withAuthReadParams } from "@/lib/api-helpers";
import {
  getItem,
  renameItem,
  moveItem,
  reorderItem,
  collectR2Keys,
  deleteItemFromDb,
} from "@/lib/media-drive";
import { deleteManyFromR2 } from "@/lib/r2";

export const GET = withAuthReadParams<{ id: string }>(async (request, { id }) => {
  const item = await getItem(id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: item });
}, "media/drive/[id]:GET");

export const PATCH = withAuthParams<{ id: string }>(async (_session, request, { id }) => {
  const body = await request.json();

  // Reorder operation (within same folder)
  if ("afterId" in body) {
    await reorderItem(id, body.afterId);
    return NextResponse.json({ data: { reordered: true } });
  }

  // Move operation
  if ("parentId" in body) {
    const result = await moveItem(id, body.parentId);
    return NextResponse.json({ data: result });
  }

  // Rename operation
  if ("name" in body && typeof body.name === "string") {
    const result = await renameItem(id, body.name.trim());
    return NextResponse.json({ data: result });
  }

  return NextResponse.json(
    { error: "Provide 'name' or 'parentId' to update" },
    { status: 400 }
  );
}, "media/drive/[id]:PATCH");

export const DELETE = withAuthParams<{ id: string }>(async (_session, _request, { id }) => {
  // Collect R2 keys first
  const r2Keys = await collectR2Keys(id);

  // Delete from R2 FIRST (spec requirement: R2 before DB)
  // If R2 fails, metadata stays intact for retry
  if (r2Keys.length > 0) {
    await deleteManyFromR2(r2Keys);
  }

  // Only delete from DB after R2 succeeds
  await deleteItemFromDb(id);

  return NextResponse.json({ data: { deleted: true } });
}, "media/drive/[id]:DELETE");
