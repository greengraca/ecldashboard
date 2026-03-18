import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncPlayerIdentities, getIdentityCount, getAllIdentityMappings } from "@/lib/player-identities";

export async function GET(request: Request) {
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
    return NextResponse.json(
      { error: "Failed to fetch identity count" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const upserted = await syncPlayerIdentities();
    return NextResponse.json({ data: { upserted } });
  } catch (err) {
    console.error("POST /api/players/identities error:", err);
    return NextResponse.json(
      { error: "Failed to sync player identities" },
      { status: 500 }
    );
  }
}
