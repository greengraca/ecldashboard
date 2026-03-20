import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { syncPlayerIdentities, getIdentityCount, getAllIdentityMappings } from "@/lib/player-identities";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("map") === "true") {
      const map = await getAllIdentityMappings();
      return NextResponse.json({ data: map });
    }
    const count = await getIdentityCount();
    return NextResponse.json({ data: { count } });
  } catch (err) {
    console.error("GET /api/players/identities error:", err);
    logApiError("players/identities:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch identity count" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const upserted = await syncPlayerIdentities();
    return NextResponse.json({ data: { upserted } });
  } catch (err) {
    console.error("POST /api/players/identities error:", err);
    logApiError("players/identities:POST", err);
    return NextResponse.json(
      { error: "Failed to sync player identities" },
      { status: 500 }
    );
  }
}
