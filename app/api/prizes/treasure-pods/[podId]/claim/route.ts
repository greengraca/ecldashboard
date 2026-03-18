import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { claimTreasurePod, unclaimTreasurePod } from "@/lib/treasure-pods";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { podId } = await params;
    const body = await request.json();
    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";

    const claim = await claimTreasurePod(podId, body, userId, userName);
    return NextResponse.json({ data: claim });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to claim pod";
    console.error("POST /api/prizes/treasure-pods/[podId]/claim error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { podId } = await params;
    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";

    await unclaimTreasurePod(podId, userId, userName);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unclaim pod";
    console.error("DELETE /api/prizes/treasure-pods/[podId]/claim error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
