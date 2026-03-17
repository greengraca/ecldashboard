import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getItem,
  renameItem,
  moveItem,
  reorderItem,
  collectR2Keys,
  deleteItemFromDb,
} from "@/lib/media-drive";
import { deleteManyFromR2 } from "@/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getItem(id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error("GET /api/media/drive/[id] error:", err);
    return NextResponse.json({ error: "Failed to get item" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
  } catch (err) {
    console.error("PATCH /api/media/drive/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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
  } catch (err) {
    console.error("DELETE /api/media/drive/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
