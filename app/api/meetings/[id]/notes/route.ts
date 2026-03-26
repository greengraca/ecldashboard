import { NextResponse } from "next/server";
import { withAuthParams, withAuthReadParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getNotes, addNote } from "@/lib/meetings";
import { meetingNoteCreateSchema } from "@/lib/validation";

export const GET = withAuthReadParams<{ id: string }>(async (_req, { id }) => {
  const notes = await getNotes(id);
  return NextResponse.json({ data: notes });
}, "meetings/[id]/notes:GET");

export const POST = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const body = await request.json();
  const parsed = meetingNoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const userId = session.user!.id!;
  const userName = getUserName(session);

  const note = await addNote(id, parsed.data.content, userId, userName);
  return NextResponse.json({ data: note }, { status: 201 });
}, "meetings/[id]/notes:POST");
