import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTransactions, createTransaction } from "@/lib/finance";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const transactions = await getTransactions(month);
    return NextResponse.json({ data: transactions });
  } catch (err) {
    console.error("GET /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
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
    const { date, type, category, description, amount, tags } = body;

    if (!date || !type || !category || !description || amount == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const month = date.substring(0, 7); // "YYYY-MM" from "YYYY-MM-DD"
    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";

    const transaction = await createTransaction(
      { month, date, type, category, description, amount: Number(amount), tags: tags || [] },
      userId,
      userName
    );

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
