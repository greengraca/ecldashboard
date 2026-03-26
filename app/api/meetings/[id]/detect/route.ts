import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getMeetingById, getNotes, createItems } from "@/lib/meetings";
import { getAllMappings } from "@/lib/user-mapping";
import { detectItems } from "@/lib/detection";

export const POST = withAuthParams<{ id: string }>(async (_session, _request, { id }) => {
  const meeting = await getMeetingById(id);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const notes = await getNotes(id);
  if (notes.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const teamMembers = await getAllMappings();
  const detected = detectItems(notes, meeting.date, teamMembers);

  if (detected.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const now = new Date().toISOString();
  const itemDocs = detected.map((d) => ({
    meeting_id: id,
    type: d.type as "task" | "deadline" | "prize",
    title: d.title,
    status: "pending" as const,
    metadata: d.metadata,
    source_quote: d.source_quote,
    created_at: now,
  }));

  const items = await createItems(id, itemDocs);
  return NextResponse.json({ data: items });
}, "meetings/[id]/detect:POST");
