import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getDragonShield } from "@/lib/dragon-shield";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const data = await getDragonShield(month);
  return NextResponse.json({ data });
}, "prizes/dragon-shield:GET");
