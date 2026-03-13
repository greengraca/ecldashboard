import { NextResponse } from "next/server";
import { getAllPendingReimbursements } from "@/lib/finance";

export async function GET() {
  try {
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
