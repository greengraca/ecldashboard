import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getEventsForMonth, createEvent } from "@/lib/calendar";
import { calendarEventCreateSchema } from "@/lib/validation";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const events = await getEventsForMonth(month);
  return NextResponse.json({ data: events });
}, "calendar/events:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const parsed = calendarEventCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);

  const event = await createEvent(
    {
      title: parsed.data.title,
      date: parsed.data.date,
      type: parsed.data.type,
      recurring: parsed.data.recurring,
      recurrence_pattern: parsed.data.recurrence_pattern,
      template_id: parsed.data.template_id,
      source: parsed.data.source,
    },
    userId,
    userName
  );

  return NextResponse.json({ data: event }, { status: 201 });
}, "calendar/events:POST");
