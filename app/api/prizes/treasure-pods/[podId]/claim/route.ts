import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { getUserName } from "@/lib/auth";
import { claimTreasurePod, unclaimTreasurePod } from "@/lib/treasure-pods";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { podId } = await params;
    const body = await request.json();
    const userId = session!.user!.id!;
    const userName = getUserName(session!);

    const claim = await claimTreasurePod(podId, body, userId, userName);
    return NextResponse.json({ data: claim });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to claim pod";
    console.error("POST /api/prizes/treasure-pods/[podId]/claim error:", err);
    logApiError("prizes/treasure-pods/[podId]/claim:POST", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { podId } = await params;
    const userId = session!.user!.id!;
    const userName = getUserName(session!);

    await unclaimTreasurePod(podId, userId, userName);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unclaim pod";
    console.error("DELETE /api/prizes/treasure-pods/[podId]/claim error:", err);
    logApiError("prizes/treasure-pods/[podId]/claim:DELETE", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
