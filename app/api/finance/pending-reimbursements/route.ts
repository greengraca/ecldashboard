import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";
import { getAllPendingReimbursements } from "@/lib/finance";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthWithRateLimit(request);
    if (error) return error;
    const pending = await getAllPendingReimbursements();
    return NextResponse.json({ data: pending });
  } catch (err) {
    console.error("GET /api/finance/pending-reimbursements error:", err);
    logApiError("finance/pending-reimbursements:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch pending reimbursements" },
      { status: 500 }
    );
  }
}
