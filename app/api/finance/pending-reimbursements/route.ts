import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAllPendingReimbursements } from "@/lib/finance";

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;
    const pending = await getAllPendingReimbursements();
    return NextResponse.json({ data: pending });
  } catch (err) {
    console.error("GET /api/finance/pending-reimbursements error:", err);
    return NextResponse.json(
      { error: "Failed to fetch pending reimbursements" },
      { status: 500 }
    );
  }
}
