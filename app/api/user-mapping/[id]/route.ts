import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateMapping, deleteMapping } from "@/lib/user-mapping";
import { userMappingUpdateSchema } from "@/lib/validation";

export const PATCH = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const body = await request.json();
  const parsed = userMappingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const userId = session.user!.id!;
  const userName = getUserName(session);

  const mapping = await updateMapping(id, parsed.data, userId, userName);
  if (!mapping) {
    return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
  }

  return NextResponse.json({ data: mapping });
}, "user-mapping/[id]:PATCH");

export const DELETE = withAuthParams<{ id: string }>(async (session, _request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await deleteMapping(id, userId, userName);
  return NextResponse.json({ data: { deleted: true } });
}, "user-mapping/[id]:DELETE");
