import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateTemplate, deleteTemplate } from "@/lib/calendar";
import { calendarTemplateUpdateSchema } from "@/lib/validation";

export const PATCH = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const body = await request.json();
  const parsed = calendarTemplateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const userId = session.user!.id!;
  const userName = getUserName(session);

  const template = await updateTemplate(id, parsed.data, userId, userName);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ data: template });
}, "calendar/templates/[id]:PATCH");

export const DELETE = withAuthParams<{ id: string }>(async (session, _request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await deleteTemplate(id, userId, userName);
  return NextResponse.json({ data: { deleted: true } });
}, "calendar/templates/[id]:DELETE");
