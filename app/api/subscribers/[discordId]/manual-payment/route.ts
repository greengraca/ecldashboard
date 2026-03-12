import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markManualPaid, unmarkManualPaid } from "@/lib/manual-payments";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ discordId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { discordId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Missing month parameter" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    const result = await markManualPaid(month, discordId, userId, userName);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    console.error("POST manual-payment error:", err);
    return NextResponse.json(
      { error: "Failed to mark manual payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ discordId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { discordId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Missing month parameter" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    await unmarkManualPaid(month, discordId, userId, userName);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("DELETE manual-payment error:", err);
    return NextResponse.json(
      { error: "Failed to unmark manual payment" },
      { status: 500 }
    );
  }
}
