import { NextRequest, NextResponse } from "next/server";
import { getSubscribers, getSubscriberSummary } from "@/lib/subscribers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [subscribers, summary] = await Promise.all([
      getSubscribers(month),
      getSubscriberSummary(month),
    ]);

    return NextResponse.json({ data: { subscribers, summary, month } });
  } catch (err) {
    console.error("GET /api/subscribers error:", err);
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }
}
