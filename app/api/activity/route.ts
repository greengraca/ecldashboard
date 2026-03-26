import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getDb } from "@/lib/mongodb";
import { activityFilterSchema } from "@/lib/validation";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const parsed = activityFilterSchema.safeParse({
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    action: searchParams.get("action") || undefined,
    entity_type: searchParams.get("entity_type") || undefined,
    user_id: searchParams.get("user_id") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid filter parameters" },
      { status: 400 }
    );
  }
  const { page, limit, action, entity_type: entityType, user_id: userId, from, to } = parsed.data;

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
}, "activity:GET");
