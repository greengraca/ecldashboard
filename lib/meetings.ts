import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { getMappingByDiscordId } from "./user-mapping";
import { createEvent, deleteEventByMeetingId } from "./calendar";
import type { Meeting, MeetingNote, MeetingItem, MeetingItemMetadata } from "./types";

const MEETINGS = "dashboard_meetings";
const NOTES = "dashboard_meeting_notes";
const ITEMS = "dashboard_meeting_items";

// ─── Indexes (flag-based, idempotent) ───

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    const meetings = db.collection(MEETINGS);
    await meetings.createIndex({ status: 1 }, { name: "status" });
    await meetings.createIndex({ date: -1 }, { name: "date_desc" });

    const notes = db.collection(NOTES);
    await notes.createIndex(
      { meeting_id: 1, timestamp: 1 },
      { name: "meeting_timestamp" }
    );

    const items = db.collection(ITEMS);
    await items.createIndex({ meeting_id: 1 }, { name: "meeting_id" });

    indexesEnsured = true;
  } catch {
    // Indexes may already exist — that's fine
    indexesEnsured = true;
  }
}

// ─── Meeting Functions ───

export async function getMeetings(limit = 20): Promise<Meeting[]> {
  await ensureIndexes();
  const db = await getDb();
  return db
    .collection<Meeting>(MEETINGS)
    .find()
    .sort({ date: -1 })
    .limit(limit)
    .toArray();
}

export async function getActiveMeeting(): Promise<Meeting | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<Meeting>(MEETINGS).findOne({ status: "active" });
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<Meeting>(MEETINGS).findOne({ _id: new ObjectId(id) });
}

async function getNextMeetingNumber(): Promise<number> {
  const db = await getDb();
  const latest = await db
    .collection<Meeting>(MEETINGS)
    .find()
    .sort({ number: -1 })
    .limit(1)
    .toArray();
  return latest.length > 0 ? latest[0].number + 1 : 1;
}

export async function startMeeting(
  userId: string,
  userName: string
): Promise<Meeting> {
  await ensureIndexes();

  // Check no active meeting exists
  const existing = await getActiveMeeting();
  if (existing) {
    throw new Error("A meeting is already active");
  }

  const [mapping, number] = await Promise.all([
    getMappingByDiscordId(userId),
    getNextMeetingNumber(),
  ]);
  const now = new Date().toISOString();
  const today = now.substring(0, 10);

  const doc: Omit<Meeting, "_id"> = {
    number,
    title: `Meeting #${number}`,
    date: today,
    started_at: now,
    status: "active",
    attendees: [
      {
        discord_id: userId,
        display_name: userName,
        color: mapping?.color || "amber",
        avatar_url: mapping?.avatar_url || null,
        joined_at: now,
      },
    ],
    present_ids: [userId],
    created_by: userId,
    created_at: now,
  };

  const db = await getDb();
  const result = await db.collection(MEETINGS).insertOne(doc);
  const meetingId = result.insertedId.toString();

  // Create a purple calendar event
  await createEvent(
    {
      title: `Meeting #${number}`,
      date: today,
      type: "meeting",
      recurring: false,
      source: { type: "meeting", meeting_id: meetingId },
    },
    userId,
    userName
  );

  logActivity(
    "create",
    "meeting",
    meetingId,
    { number, title: doc.title },
    userId,
    userName
  );

  return { _id: result.insertedId, ...doc };
}

export async function endMeeting(
  id: string,
  userId: string,
  userName: string
): Promise<Meeting | null> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();

  const result = await db.collection<Meeting>(MEETINGS).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status: "ended", ended_at: now, present_ids: [] } },
    { returnDocument: "after" }
  );

  if (result) {
    logActivity(
      "end",
      "meeting",
      id,
      { number: result.number, title: result.title },
      userId,
      userName
    );
  }

  return result;
}

export async function updateMeeting(
  id: string,
  data: { title?: string },
  userId: string,
  userName: string
): Promise<Meeting | null> {
  await ensureIndexes();
  const db = await getDb();

  const result = await db.collection<Meeting>(MEETINGS).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: "after" }
  );

  if (result) {
    logActivity(
      "update",
      "meeting",
      id,
      { updated_fields: Object.keys(data) },
      userId,
      userName
    );
  }

  return result;
}

export async function deleteMeeting(
  id: string,
  userId: string,
  userName: string
): Promise<void> {
  await ensureIndexes();
  const db = await getDb();

  const meeting = await db.collection<Meeting>(MEETINGS).findOne({ _id: new ObjectId(id) });

  // Delete notes, items, and linked calendar event for this meeting
  await Promise.all([
    db.collection(NOTES).deleteMany({ meeting_id: id }),
    db.collection(ITEMS).deleteMany({ meeting_id: id }),
    deleteEventByMeetingId(id),
    db.collection(MEETINGS).deleteOne({ _id: new ObjectId(id) }),
  ]);

  logActivity(
    "delete",
    "meeting",
    id,
    { number: meeting?.number, title: meeting?.title },
    userId,
    userName
  );
}

export async function joinMeeting(
  id: string,
  userId: string,
  userName: string
): Promise<Meeting | null> {
  await ensureIndexes();
  const db = await getDb();

  // Check if already in attendees
  const meeting = await db
    .collection<Meeting>(MEETINGS)
    .findOne({ _id: new ObjectId(id) });
  if (!meeting) return null;

  const alreadyJoined = meeting.attendees.some(
    (a) => a.discord_id === userId
  );
  if (alreadyJoined) return meeting;

  const mapping = await getMappingByDiscordId(userId);
  const now = new Date().toISOString();

  const result = await db.collection<Meeting>(MEETINGS).findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $push: {
        attendees: {
          discord_id: userId,
          display_name: userName,
          color: mapping?.color || "amber",
          avatar_url: mapping?.avatar_url || null,
          joined_at: now,
        },
      },
      $addToSet: { present_ids: userId },
    },
    { returnDocument: "after" }
  );

  if (result) {
    logActivity(
      "join",
      "meeting",
      id,
      { display_name: userName },
      userId,
      userName
    );
  }

  return result;
}

// ─── Presence Functions ───

export async function setPresence(
  id: string,
  userId: string,
  userName: string,
  present: boolean
): Promise<Meeting | null> {
  const db = await getDb();
  const update = present
    ? { $addToSet: { present_ids: userId } }
    : { $pull: { present_ids: userId } };

  // Only update presence on active meetings
  const meeting = await db.collection<Meeting>(MEETINGS).findOneAndUpdate(
    { _id: new ObjectId(id), status: "active" },
    update,
    { returnDocument: "after" }
  );

  // Meeting not found or already ended — nothing to do
  if (!meeting) return null;

  // Auto-end when room becomes empty
  if (!present && (!meeting.present_ids || meeting.present_ids.length === 0)) {
    const noteCount = await db
      .collection(NOTES)
      .countDocuments({ meeting_id: id });

    if (noteCount === 0) {
      await deleteMeeting(id, userId, userName);
      return null;
    } else {
      return endMeeting(id, userId, userName);
    }
  }

  return meeting;
}

// ─── Note Functions ───

export async function getNotes(meetingId: string): Promise<MeetingNote[]> {
  await ensureIndexes();
  const db = await getDb();
  return db
    .collection<MeetingNote>(NOTES)
    .find({ meeting_id: meetingId })
    .sort({ timestamp: 1 })
    .toArray();
}

export async function addNote(
  meetingId: string,
  content: string,
  userId: string,
  userName: string
): Promise<MeetingNote> {
  await ensureIndexes();
  const mapping = await getMappingByDiscordId(userId);
  const now = new Date().toISOString();

  const doc: Omit<MeetingNote, "_id"> = {
    meeting_id: meetingId,
    author_discord_id: userId,
    author_name: userName,
    author_color: mapping?.color || "amber",
    content,
    timestamp: now,
  };

  const db = await getDb();
  const result = await db.collection(NOTES).insertOne(doc);

  logActivity(
    "create",
    "meeting_note",
    result.insertedId.toString(),
    { meeting_id: meetingId, content_length: content.length },
    userId,
    userName
  );

  return { _id: result.insertedId, ...doc };
}

// ─── Item Functions ───

export async function getItems(meetingId: string): Promise<MeetingItem[]> {
  await ensureIndexes();
  const db = await getDb();
  return db
    .collection<MeetingItem>(ITEMS)
    .find({ meeting_id: meetingId })
    .toArray();
}

export async function createItems(
  meetingId: string,
  items: Omit<MeetingItem, "_id">[]
): Promise<MeetingItem[]> {
  if (items.length === 0) return [];
  await ensureIndexes();
  const db = await getDb();
  const result = await db.collection(ITEMS).insertMany(items);
  return items.map((item, i) => ({
    _id: result.insertedIds[i],
    ...item,
  }));
}

export async function updateItem(
  itemId: string,
  data: { status?: string; title?: string; metadata?: Record<string, unknown> },
  userId: string,
  userName: string
): Promise<MeetingItem | null> {
  await ensureIndexes();
  const db = await getDb();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFields: Record<string, any> = { ...data };

  // When accepted, record who resolved it
  if (data.status === "accepted") {
    updateFields.resolved_by = userId;
    updateFields.resolved_at = new Date().toISOString();
  }

  const result = await db.collection<MeetingItem>(ITEMS).findOneAndUpdate(
    { _id: new ObjectId(itemId) },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  if (result) {
    logActivity(
      "update",
      "meeting_item",
      itemId,
      { updated_fields: Object.keys(data), status: data.status },
      userId,
      userName
    );
  }

  return result;
}

export async function acceptItem(
  itemId: string,
  userId: string,
  userName: string
): Promise<MeetingItem | null> {
  const db = await getDb();
  const item = await db.collection<MeetingItem>(ITEMS).findOne({ _id: new ObjectId(itemId) });
  if (!item) return null;

  const now = new Date().toISOString();
  let createdEntityId: string | undefined;
  let createdEntityType: string | undefined;
  const meta = item.metadata as MeetingItemMetadata;

  if (item.type === "task") {
    // Create task in Taskpad via dynamic import to avoid circular deps
    try {
      const { createTask } = await import("./taskpad");
      const task = await createTask(
        { text: item.title },
        userId,
        userName,
        { meeting_id: item.meeting_id, meeting_number: 0 }
      );
      if (task) {
        createdEntityId = task.id;
        createdEntityType = "taskpad_task";
      }
    } catch (err) {
      console.error("Failed to create Taskpad task from meeting item:", err);
    }
  } else if (item.type === "deadline") {
    const event = await createEvent(
      {
        title: item.title,
        date: meta.date || now.substring(0, 10),
        type: (meta.event_type as "league" | "feature" | "deadline" | "urgent" | "meeting") || "deadline",
        recurring: false,
        source: { type: "meeting", meeting_id: item.meeting_id },
      },
      userId,
      userName
    );
    createdEntityId = String(event._id);
    createdEntityType = "calendar_event";
  } else if (item.type === "prize") {
    // Prize creation — log it but don't auto-create (too many fields needed)
    logActivity(
      "create",
      "meeting_item",
      itemId,
      { action: "prize_accepted", title: item.title, budget: meta.budget },
      userId,
      userName
    );
    createdEntityType = "prize_suggestion";
  }

  // Mark item as accepted
  const result = await db.collection<MeetingItem>(ITEMS).findOneAndUpdate(
    { _id: new ObjectId(itemId) },
    {
      $set: {
        status: "accepted",
        resolved_by: userId,
        resolved_at: now,
        created_entity_id: createdEntityId,
        created_entity_type: createdEntityType,
      },
    },
    { returnDocument: "after" }
  );

  return result;
}
