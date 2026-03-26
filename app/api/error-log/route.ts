import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getDb } from "@/lib/mongodb";
import { errorLogFilterSchema } from "@/lib/validation";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const parsed = errorLogFilterSchema.safeParse({
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    level: searchParams.get("level") || undefined,
    source: searchParams.get("source") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid filter parameters" },
      { status: 400 }
    );
  }
  const { page, limit, level, source, from, to } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (level) filter.level = level;
  if (source) filter.source = source;
  if (from || to) {
    filter.timestamp = {};
    if (from) (filter.timestamp as Record<string, string>).$gte = new Date(from).toISOString();
    if (to) (filter.timestamp as Record<string, string>).$lte = new Date(to + "T23:59:59.999Z").toISOString();
  }

  const db = await getDb();
  const collection = db.collection("dashboard_error_log");

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

  return NextResponse.json({ data, total, page, totalPages });
}, "error-log:GET");
