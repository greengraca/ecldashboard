import { getDb } from "./mongodb";
import type { ActivityAction } from "./types";

export async function logActivity(
  action: ActivityAction,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
  userId: string,
  userName: string
): Promise<void> {
  try {
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
