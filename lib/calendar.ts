import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import type { CalendarEvent, CalendarEventType, CalendarTemplate } from "./types";

const EVENTS_COLLECTION = "dashboard_calendar_events";
const TEMPLATES_COLLECTION = "dashboard_calendar_templates";

// ─── Indexes (flag-based, idempotent) ───

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    const events = db.collection(EVENTS_COLLECTION);
    await events.createIndex({ date: 1 }, { name: "date_asc" });
    await events.createIndex({ template_id: 1 }, { name: "template_id" });

    const templates = db.collection(TEMPLATES_COLLECTION);
    await templates.createIndex({ active: 1 }, { name: "active" });

    indexesEnsured = true;
  } catch {
    // Indexes may already exist — that's fine
    indexesEnsured = true;
  }
}

// ─── Template Auto-Population ───

/** Resolve day_of_month: positive = fixed day, negative = offset from end (-1 = last, -2 = second-to-last) */
function resolveDay(dayOfMonth: number, month: string): number {
  if (dayOfMonth > 0) return dayOfMonth;
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  return daysInMonth + dayOfMonth + 1;
}

function monthRange(month: string): { $gte: string; $lt: string } {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { $gte: `${month}-01`, $lt: `${next}-01` };
}

async function populateFromTemplates(month: string): Promise<void> {
  await ensureIndexes();
  const db = await getDb();

  const templates = await db
    .collection<CalendarTemplate>(TEMPLATES_COLLECTION)
    .find({ active: true })
    .toArray();

  if (templates.length === 0) return;

  const templateIds = templates.map((t) => String(t._id));
  const existing = await db
    .collection<CalendarEvent>(EVENTS_COLLECTION)
    .find({
      template_id: { $in: templateIds },
      date: monthRange(month),
    })
    .toArray();

  const existingTemplateIds = new Set(existing.map((e) => e.template_id));
  const now = new Date().toISOString();

  for (const template of templates) {
    const tid = String(template._id);
    if (existingTemplateIds.has(tid)) continue;

    const day = String(resolveDay(template.day_of_month, month)).padStart(2, "0");
    const date = `${month}-${day}`;

    const doc: Omit<CalendarEvent, "_id"> = {
      title: template.title,
      date,
      type: template.type,
      recurring: true,
      template_id: tid,
      created_by: "system",
      created_by_name: "system",
      created_at: now,
      updated_at: now,
    };

    await db.collection(EVENTS_COLLECTION).insertOne(doc);
  }
}

// ─── Events CRUD ───

export async function getEventsForMonth(month: string): Promise<CalendarEvent[]> {
  await populateFromTemplates(month);
  const db = await getDb();
  return db
    .collection<CalendarEvent>(EVENTS_COLLECTION)
    .find({ date: monthRange(month) })
    .sort({ date: 1 })
    .toArray();
}

export async function createEvent(
  data: {
    title: string;
    date: string;
    type: CalendarEventType;
    recurring?: boolean;
    recurrence_pattern?: { day_of_month: number; months?: string[] };
    template_id?: string;
    source?: { type: "meeting" | "manual"; meeting_id?: string };
  },
  userId: string,
  userName: string
): Promise<CalendarEvent> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();

  const doc: Omit<CalendarEvent, "_id"> = {
    title: data.title,
    date: data.date,
    type: data.type,
    recurring: data.recurring || false,
    ...(data.recurrence_pattern && { recurrence_pattern: data.recurrence_pattern }),
    ...(data.template_id && { template_id: data.template_id }),
    ...(data.source && { source: data.source }),
    created_by: userId,
    created_by_name: userName,
    created_at: now,
    updated_at: now,
  };

  const result = await db.collection(EVENTS_COLLECTION).insertOne(doc);

  await logActivity("create", "calendar_event", result.insertedId.toString(), {
    title: data.title,
    date: data.date,
    type: data.type,
  }, userId, userName);

  return { _id: result.insertedId, ...doc };
}

export async function updateEvent(
  id: string,
  data: Partial<{
    title: string;
    date: string;
    type: CalendarEventType;
    recurring: boolean;
    recurrence_pattern: { day_of_month: number; months?: string[] } | null;
  }>,
  userId: string,
  userName: string
): Promise<CalendarEvent | null> {
  const db = await getDb();

  // Separate null fields for $unset
  const { recurrence_pattern, ...rest } = data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {
    $set: { ...rest, updated_at: new Date().toISOString() },
  };

  if (recurrence_pattern === null) {
    update.$unset = { recurrence_pattern: "" };
  } else if (recurrence_pattern !== undefined) {
    update.$set.recurrence_pattern = recurrence_pattern;
  }

  const result = await db
    .collection<CalendarEvent>(EVENTS_COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      { returnDocument: "after" }
    );

  if (!result) return null;

  await logActivity("update", "calendar_event", id, {
    updated_fields: Object.keys(data),
  }, userId, userName);

  return result;
}

export async function deleteEvent(
  id: string,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();
  const doc = await db
    .collection<CalendarEvent>(EVENTS_COLLECTION)
    .findOne({ _id: new ObjectId(id) });

  await db.collection(EVENTS_COLLECTION).deleteOne({ _id: new ObjectId(id) });

  await logActivity("delete", "calendar_event", id, {
    title: doc?.title,
    date: doc?.date,
  }, userId, userName);
}

export async function deleteEventByMeetingId(meetingId: string): Promise<void> {
  const db = await getDb();
  await db.collection(EVENTS_COLLECTION).deleteMany({
    "source.type": "meeting",
    "source.meeting_id": meetingId,
  });
}

// ─── Templates CRUD ───

export async function getTemplates(): Promise<CalendarTemplate[]> {
  await ensureIndexes();
  const db = await getDb();
  return db
    .collection<CalendarTemplate>(TEMPLATES_COLLECTION)
    .find()
    .sort({ day_of_month: 1 })
    .toArray();
}

export async function createTemplate(
  data: {
    title: string;
    type: CalendarEventType;
    day_of_month: number;
  },
  userId: string,
  userName: string
): Promise<CalendarTemplate> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();

  const doc: Omit<CalendarTemplate, "_id"> = {
    title: data.title,
    type: data.type,
    day_of_month: data.day_of_month,
    active: true,
    created_by: userName,
    created_at: now,
  };

  const result = await db.collection(TEMPLATES_COLLECTION).insertOne(doc);

  await logActivity("create", "calendar_template", result.insertedId.toString(), {
    title: data.title,
    type: data.type,
    day_of_month: data.day_of_month,
  }, userId, userName);

  return { _id: result.insertedId, ...doc };
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    title: string;
    type: CalendarEventType;
    day_of_month: number;
    active: boolean;
  }>,
  userId: string,
  userName: string
): Promise<CalendarTemplate | null> {
  const db = await getDb();

  const result = await db
    .collection<CalendarTemplate>(TEMPLATES_COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: "after" }
    );

  if (!result) return null;

  await logActivity("update", "calendar_template", id, {
    updated_fields: Object.keys(data),
  }, userId, userName);

  return result;
}

export async function deleteTemplate(
  id: string,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();
  const doc = await db
    .collection<CalendarTemplate>(TEMPLATES_COLLECTION)
    .findOne({ _id: new ObjectId(id) });

  await db.collection(TEMPLATES_COLLECTION).deleteOne({ _id: new ObjectId(id) });

  await logActivity("delete", "calendar_template", id, {
    title: doc?.title,
    day_of_month: doc?.day_of_month,
  }, userId, userName);
}
