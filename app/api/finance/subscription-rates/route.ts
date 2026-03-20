import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";
import { getAllRates, createRate } from "@/lib/subscription-rates";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthWithRateLimit(request);
    if (error) return error;
    const rates = await getAllRates();
    return NextResponse.json({ data: rates });
  } catch (err) {
    console.error("GET /api/finance/subscription-rates error:", err);
    logApiError("finance/subscription-rates:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch subscription rates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const body = await request.json();
    const { effective_from, patreon_net, kofi_net, manual_net } = body;

    if (
      !effective_from ||
      patreon_net == null ||
      kofi_net == null ||
      manual_net == null
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = session!.user!.id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session!.user as any).username || session!.user!.name || "unknown";

    const rate = await createRate(
      {
        effective_from,
        patreon_net: Number(patreon_net),
        kofi_net: Number(kofi_net),
        manual_net: Number(manual_net),
      },
      userId,
      userName
    );

    return NextResponse.json({ data: rate }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finance/subscription-rates error:", err);
    logApiError("finance/subscription-rates:POST", err);
    return NextResponse.json(
      { error: "Failed to create subscription rate" },
      { status: 500 }
    );
  }
}
