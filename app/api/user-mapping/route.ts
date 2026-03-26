import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getAllMappings, createMapping } from "@/lib/user-mapping";
import { userMappingCreateSchema } from "@/lib/validation";

export const GET = withAuthRead(async () => {
  const mappings = await getAllMappings();
  return NextResponse.json({ data: mappings });
}, "user-mapping:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const parsed = userMappingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const userId = session.user!.id!;
  const userName = getUserName(session);

  const mapping = await createMapping(parsed.data, userId, userName);
  return NextResponse.json({ data: mapping }, { status: 201 });
}, "user-mapping:POST");
