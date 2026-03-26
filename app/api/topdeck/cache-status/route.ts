import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getTopDeckCacheStatus } from "@/lib/topdeck-cache";

export const GET = withAuthRead(async () => {
  return NextResponse.json({ data: getTopDeckCacheStatus() });
}, "topdeck/cache-status:GET");
