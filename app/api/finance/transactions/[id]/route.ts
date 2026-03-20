import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";
import { updateTransaction, deleteTransaction } from "@/lib/finance";
import { transactionUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = transactionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const userId = session!.user!.id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session!.user as any).username || session!.user!.name || "unknown";

    await updateTransaction(id, parsed.data, userId, userName);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("PATCH /api/finance/transactions/[id] error:", err);
    logApiError("finance/transactions/[id]:PATCH", err);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { id } = await params;
    const userId = session!.user!.id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session!.user as any).username || session!.user!.name || "unknown";

    await deleteTransaction(id, userId, userName);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("DELETE /api/finance/transactions/[id] error:", err);
    logApiError("finance/transactions/[id]:DELETE", err);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
