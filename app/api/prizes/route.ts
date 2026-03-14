import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrizes, createPrize } from "@/lib/prizes";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const prizes = await getPrizes(month);
    return NextResponse.json({ data: prizes });
  } catch (err) {
    console.error("GET /api/prizes error:", err);
    return NextResponse.json(
      { error: "Failed to fetch prizes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { month, category, name, value, recipient_type, recipient_name } = body;

    if (!month || !category || !name || value == null || !recipient_type || !recipient_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";

    const prize = await createPrize(
      {
        month,
        category,
        name,
        description: body.description || "",
        image_url: body.image_url || null,
        value: Number(value),
        recipient_type,
        placement: body.placement ?? null,
        recipient_uid: body.recipient_uid || null,
        recipient_name,
        recipient_discord_id: body.recipient_discord_id || null,
        shipping_status: body.shipping_status || "pending",
        status: body.status || "planned",
      },
      userId,
      userName
    );

    return NextResponse.json({ data: prize }, { status: 201 });
  } catch (err) {
    console.error("POST /api/prizes error:", err);
    return NextResponse.json(
      { error: "Failed to create prize" },
      { status: 500 }
    );
  }
}
