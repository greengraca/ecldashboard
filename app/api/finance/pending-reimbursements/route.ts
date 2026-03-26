import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getAllPendingReimbursements } from "@/lib/finance";

export const GET = withAuthRead(async () => {
  const pending = await getAllPendingReimbursements();
  return NextResponse.json({ data: pending });
}, "finance/pending-reimbursements:GET");
