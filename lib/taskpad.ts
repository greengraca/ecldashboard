import { getFirestoreDb, isFirebaseConfigured } from "./firebase-admin";
import { logActivity } from "./activity";
import { getMappingByDiscordId } from "./user-mapping";
import { TASKPAD_TEAM_ID } from "./constants";
import type { TaskpadTask } from "./types";

/**
 * Fetch all non-deleted tasks for the ECL team project.
 * Returns sorted: incomplete first (by order asc), then completed.
 */
export async function getTeamTasks(): Promise<TaskpadTask[]> {
  try {
    if (!(await isFirebaseConfigured())) return [];
    if (!TASKPAD_TEAM_ID) return [];

    const db = await getFirestoreDb();
    const snapshot = await db
      .collection(`projects/${TASKPAD_TEAM_ID}/tasks`)
      .where("deleted", "==", false)
      .get();

    const tasks: TaskpadTask[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();

      tasks.push({
        id: doc.id,
        text: data.text ?? "",
        done: data.done ?? false,
        deleted: data.deleted ?? false,
        createdByUid: data.createdByUid ?? "",
        createdByEmail: data.createdByEmail ?? null,
        ts: data.ts ?? 0,
        order: data.order,
        updatedAt: data.updatedAt,
        source_meeting_id: data.source_meeting_id,
        source_meeting_number: data.source_meeting_number,
      });
    }

    // Sort: incomplete first (by order asc), then completed
    tasks.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.order ?? a.ts) - (b.order ?? b.ts);
    });

    return tasks;
  } catch (err) {
    console.error("Failed to fetch taskpad tasks:", err);
    return [];
  }
}

/**
 * Create a new task in the team's Firestore taskpad.
 */
export async function createTask(
  data: { text: string },
  userId: string,
  userName: string,
  meetingInfo?: { meeting_id: string; meeting_number: number }
): Promise<TaskpadTask> {
  const db = await getFirestoreDb();
  const mapping = await getMappingByDiscordId(userId);

  const now = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docData: Record<string, any> = {
    text: data.text,
    done: false,
    deleted: false,
    createdByUid: mapping?.firebase_uid ?? "",
    createdByEmail: null,
    ts: now,
    order: now,
  };

  if (meetingInfo) {
    docData.source_meeting_id = meetingInfo.meeting_id;
    docData.source_meeting_number = meetingInfo.meeting_number;
  }

  const docRef = await db
    .collection(`projects/${TASKPAD_TEAM_ID}/tasks`)
    .add(docData);

  await logActivity(
    "create",
    "taskpad_task",
    docRef.id,
    { text: data.text },
    userId,
    userName
  );

  return {
    id: docRef.id,
    text: data.text,
    done: false,
    deleted: false,
    createdByUid: docData.createdByUid,
    createdByEmail: null,
    ts: now,
    order: now,
    source_meeting_id: meetingInfo?.meeting_id,
    source_meeting_number: meetingInfo?.meeting_number,
  };
}

/**
 * Update an existing task (toggle done, edit text).
 */
export async function updateTask(
  taskId: string,
  data: { done?: boolean; text?: string },
  userId: string,
  userName: string
): Promise<void> {
  const db = await getFirestoreDb();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    ...data,
    updatedAt: Date.now(),
  };

  await db
    .doc(`projects/${TASKPAD_TEAM_ID}/tasks/${taskId}`)
    .update(updateData);

  await logActivity(
    "update",
    "taskpad_task",
    taskId,
    data,
    userId,
    userName
  );
}

/**
 * Soft-delete a task (sets deleted: true).
 */
export async function deleteTask(
  taskId: string,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getFirestoreDb();

  await db
    .doc(`projects/${TASKPAD_TEAM_ID}/tasks/${taskId}`)
    .update({ deleted: true, deletedAt: Date.now() });

  await logActivity(
    "delete",
    "taskpad_task",
    taskId,
    {},
    userId,
    userName
  );
}

/**
 * Check if Firestore is configured and accessible.
 * Caches result for 5 minutes to avoid repeated connectivity checks.
 */
let statusCache: { value: boolean; expires: number } | null = null;

export async function getFirebaseStatus(): Promise<boolean> {
  if (statusCache && Date.now() < statusCache.expires) return statusCache.value;

  try {
    if (!(await isFirebaseConfigured())) return false;
    if (!TASKPAD_TEAM_ID) return false;

    const db = await getFirestoreDb();
    await db
      .collection(`projects/${TASKPAD_TEAM_ID}/tasks`)
      .limit(1)
      .get();

    statusCache = { value: true, expires: Date.now() + 5 * 60 * 1000 };
    return true;
  } catch {
    statusCache = { value: false, expires: Date.now() + 30 * 1000 };
    return false;
  }
}
