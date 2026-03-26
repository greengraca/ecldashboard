import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { updateTask, deleteTask } from "@/lib/taskpad";

export const PATCH = withAuthParams<{ id: string }>(
  async (session, request, { id }) => {
    const body = await request.json();

    const data: { done?: boolean; text?: string } = {};
    if (typeof body.done === "boolean") data.done = body.done;
    if (typeof body.text === "string") {
      const trimmed = body.text.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "Task text cannot be empty" },
          { status: 400 }
        );
      }
      data.text = trimmed;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const userId = session.user!.id!;
    const userName = getUserName(session);

    await updateTask(id, data, userId, userName);
    return NextResponse.json({ data: { updated: true } });
  },
  "taskpad/[id]:PATCH"
);

export const DELETE = withAuthParams<{ id: string }>(
  async (session, _request, { id }) => {
    const userId = session.user!.id!;
    const userName = getUserName(session);

    await deleteTask(id, userId, userName);
    return NextResponse.json({ data: { deleted: true } });
  },
  "taskpad/[id]:DELETE"
);
