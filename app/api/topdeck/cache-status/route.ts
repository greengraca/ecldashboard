import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logApiError } from "@/lib/error-log";
import { getTopDeckCacheStatus } from "@/lib/topdeck-cache";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data: getTopDeckCacheStatus() });
}
