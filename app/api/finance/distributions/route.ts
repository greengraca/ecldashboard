import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getDistributionLedger, distributeMonth } from "@/lib/distributions";
import { distributeSchema } from "@/lib/validation";

export const GET = withAuthRead(async () => {
  const ledger = await getDistributionLedger();
  return NextResponse.json({ data: ledger });
}, "finance/distributions:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const parsed = distributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const userId = session.user!.id!;
  const userName = getUserName(session);
  try {
    const row = await distributeMonth(parsed.data.month, parsed.data.note ?? null, userId, userName);
    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to distribute" },
      { status: 400 }
    );
  }
}, "finance/distributions:POST");
