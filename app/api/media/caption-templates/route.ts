import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getAllCaptionTemplates } from "@/lib/caption-templates";

export const GET = withAuthRead(async () => {
  const templates = await getAllCaptionTemplates();
  return NextResponse.json({ data: templates });
}, "media/caption-templates:GET");
