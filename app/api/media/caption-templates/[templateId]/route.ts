import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { upsertCaptionTemplate, deleteCaptionTemplate } from "@/lib/caption-templates";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId } = await params;
    const { captionTemplate } = await request.json();
    if (typeof captionTemplate !== "string" || !captionTemplate.trim()) {
      return NextResponse.json({ error: "captionTemplate is required" }, { status: 400 });
    }

    await upsertCaptionTemplate(templateId, captionTemplate, session.user.id);
    return NextResponse.json({ data: { templateId, captionTemplate } });
  } catch (err) {
    console.error("PUT /api/media/caption-templates/[templateId] error:", err);
    return NextResponse.json(
      { error: "Failed to save caption template" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId } = await params;
    const deleted = await deleteCaptionTemplate(templateId);
    if (!deleted) {
      return NextResponse.json({ error: "No custom template found" }, { status: 404 });
    }
    return NextResponse.json({ data: { templateId, reset: true } });
  } catch (err) {
    console.error("DELETE /api/media/caption-templates/[templateId] error:", err);
    return NextResponse.json(
      { error: "Failed to delete caption template" },
      { status: 500 },
    );
  }
}
