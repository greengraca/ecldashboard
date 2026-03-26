import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { upsertCaptionTemplate, deleteCaptionTemplate } from "@/lib/caption-templates";

export const PUT = withAuthParams<{ templateId: string }>(async (session, request, { templateId }) => {
  const { captionTemplate } = await request.json();
  if (typeof captionTemplate !== "string" || !captionTemplate.trim()) {
    return NextResponse.json({ error: "captionTemplate is required" }, { status: 400 });
  }

  await upsertCaptionTemplate(templateId, captionTemplate, session.user!.id!);
  return NextResponse.json({ data: { templateId, captionTemplate } });
}, "media/caption-templates/[templateId]:PUT");

export const DELETE = withAuthParams<{ templateId: string }>(async (_session, _request, { templateId }) => {
  const deleted = await deleteCaptionTemplate(templateId);
  if (!deleted) {
    return NextResponse.json({ error: "No custom template found" }, { status: 404 });
  }
  return NextResponse.json({ data: { templateId, reset: true } });
}, "media/caption-templates/[templateId]:DELETE");
