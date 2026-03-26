import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getFirebaseStatus } from "@/lib/taskpad";

export const GET = withAuthRead(async () => {
  const connected = await getFirebaseStatus();
  return NextResponse.json({ data: { connected } });
}, "taskpad/status:GET");
