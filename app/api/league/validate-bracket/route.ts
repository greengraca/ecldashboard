import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const bracketId = searchParams.get("id");

  if (!bracketId || bracketId.length < 5) {
    return NextResponse.json({ error: "Invalid bracket ID" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://topdeck.gg/PublicPData/${bracketId}`, {
      signal: AbortSignal.timeout(10000),
    });
    return NextResponse.json({ data: { valid: res.ok } });
  } catch {
    return NextResponse.json({ data: { valid: false } });
  }
}, "league/validate-bracket:GET");
