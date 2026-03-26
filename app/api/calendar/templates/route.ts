import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getTemplates, createTemplate } from "@/lib/calendar";
import { calendarTemplateCreateSchema } from "@/lib/validation";

export const GET = withAuthRead(async () => {
  const templates = await getTemplates();
  return NextResponse.json({ data: templates });
}, "calendar/templates:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const parsed = calendarTemplateCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const template = await createTemplate(parsed.data, userId, userName);
  return NextResponse.json({ data: template }, { status: 201 });
}, "calendar/templates:POST");
