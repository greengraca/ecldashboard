import { NextRequest, NextResponse } from "next/server";
import { getManualPayments } from "@/lib/manual-payments";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const payments = await getManualPayments(month);
    return NextResponse.json({ data: payments });
  } catch (err) {
    console.error("GET /api/subscribers/manual-payments error:", err);
    return NextResponse.json(
      { error: "Failed to fetch manual payments" },
      { status: 500 }
    );
  }
}
