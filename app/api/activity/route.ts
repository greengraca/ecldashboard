import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const userId = searchParams.get("user_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (action) filter.action = action;
    if (entityType) filter.entity_type = entityType;
    if (userId) filter.user_id = userId;

    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, string>).$gte = new Date(from).toISOString();
      if (to) (filter.timestamp as Record<string, string>).$lte = new Date(to + "T23:59:59.999Z").toISOString();
    }

    const db = await getDb();
    const collection = db.collection("dashboard_activity_log");

    const [total, data] = await Promise.all([
      collection.countDocuments(filter),
      collection
        .find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      data,
      total,
      page,
      totalPages,
    });
  } catch (err) {
    console.error("GET /api/activity error:", err);
    return NextResponse.json(
      { error: "Failed to fetch activity log" },
      { status: 500 }
    );
  }
}
