import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateEvent, deleteEvent } from "@/lib/calendar";
import { calendarEventUpdateSchema } from "@/lib/validation";

export const PATCH = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const body = await request.json();
  const parsed = calendarEventUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const userId = session.user!.id!;
  const userName = getUserName(session);

  const event = await updateEvent(id, parsed.data, userId, userName);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ data: event });
}, "calendar/events/[id]:PATCH");

export const DELETE = withAuthParams<{ id: string }>(async (session, _request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await deleteEvent(id, userId, userName);
  return NextResponse.json({ data: { deleted: true } });
}, "calendar/events/[id]:DELETE");
