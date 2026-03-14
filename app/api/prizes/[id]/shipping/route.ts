import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateShipping } from "@/lib/prizes";

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

    const prize = await updateShipping(id, body, userId, userName);
    if (!prize) {
      return NextResponse.json({ error: "Prize not found" }, { status: 404 });
    }

    return NextResponse.json({ data: prize });
  } catch (err) {
    console.error("PATCH /api/prizes/[id]/shipping error:", err);
    return NextResponse.json(
      { error: "Failed to update shipping" },
      { status: 500 }
    );
  }
}
