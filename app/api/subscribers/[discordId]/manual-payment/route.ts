import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { getUserName } from "@/lib/auth";
import { logApiError } from "@/lib/error-log";
import { markManualPaid, unmarkManualPaid } from "@/lib/manual-payments";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ discordId: string }> }
) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { discordId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Missing month parameter" },
        { status: 400 }
      );
    }

    const userId = session!.user!.id!;
    const userName = getUserName(session!);

    const result = await markManualPaid(month, discordId, userId, userName);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    console.error("POST manual-payment error:", err);
    logApiError("subscribers/[discordId]/manual-payment:POST", err);
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
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { discordId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Missing month parameter" },
        { status: 400 }
      );
    }

    const userId = session!.user!.id!;
    const userName = getUserName(session!);

    await unmarkManualPaid(month, discordId, userId, userName);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("DELETE manual-payment error:", err);
    logApiError("subscribers/[discordId]/manual-payment:DELETE", err);
    return NextResponse.json(
      { error: "Failed to unmark manual payment" },
      { status: 500 }
    );
  }
}
