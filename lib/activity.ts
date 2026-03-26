import { getDb } from "./mongodb";
import type { ActivityAction } from "./types";

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    const col = db.collection("dashboard_activity_log");
    await col.createIndex({ timestamp: -1 }, { name: "timestamp_desc" });
    await col.createIndex(
      { entity_type: 1, timestamp: -1 },
      { name: "entity_type_timestamp" }
    );
    indexesEnsured = true;
  } catch {
    // Indexes may already exist — that's fine
    indexesEnsured = true;
  }
}

export async function logActivity(
  action: ActivityAction,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
  userId: string,
  userName: string
): Promise<void> {
  try {
    await ensureIndexes();
    const db = await getDb();
    await db.collection("dashboard_activity_log").insertOne({
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      user_id: userId,
      user_name: userName,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
