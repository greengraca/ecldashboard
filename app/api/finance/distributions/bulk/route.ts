import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { distributeThrough } from "@/lib/distributions";
import { bulkDistributeSchema } from "@/lib/validation";

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const parsed = bulkDistributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const userId = session.user!.id!;
  const userName = getUserName(session);
  try {
    const ledger = await distributeThrough(parsed.data.upToMonth, parsed.data.note ?? null, userId, userName);
    return NextResponse.json({ data: ledger });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to distribute" },
      { status: 400 }
    );
  }
}, "finance/distributions/bulk:POST");
