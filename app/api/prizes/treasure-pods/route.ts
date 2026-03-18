import { NextRequest, NextResponse } from "next/server";
import { getTreasurePodData } from "@/lib/treasure-pods";

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month");
    if (!month) {
      return NextResponse.json({ error: "month is required" }, { status: 400 });
    }

    const data = await getTreasurePodData(month);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/prizes/treasure-pods error:", err);
    return NextResponse.json({ error: "Failed to fetch treasure pods" }, { status: 500 });
  }
}
