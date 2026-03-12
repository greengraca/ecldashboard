import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateFixedCost, deleteFixedCost } from "@/lib/finance";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";

    await updateFixedCost(id, body, userId, userName);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("PATCH /api/finance/fixed-costs/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update fixed cost" },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";

    await deleteFixedCost(id, userId, userName);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("DELETE /api/finance/fixed-costs/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete fixed cost" },
      { status: 500 }
    );
  }
}
