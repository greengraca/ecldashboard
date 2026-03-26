import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { getUserName } from "@/lib/auth";
import { updateShipping } from "@/lib/prizes";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const userId = session!.user!.id!;
    const userName = getUserName(session!);

    const prize = await updateShipping(id, body, userId, userName);
    if (!prize) {
      return NextResponse.json({ error: "Prize not found" }, { status: 404 });
    }

    return NextResponse.json({ data: prize });
  } catch (err) {
    console.error("PATCH /api/prizes/[id]/shipping error:", err);
    logApiError("prizes/[id]/shipping:PATCH", err);
    return NextResponse.json(
      { error: "Failed to update shipping" },
      { status: 500 }
    );
  }
}
