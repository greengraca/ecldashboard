import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import type { DragonShieldMonth, DragonShieldCode, DragonShieldFile } from "./types";

const COLLECTION = "dashboard_dragon_shield";

export async function getDragonShield(month: string): Promise<DragonShieldMonth | null> {
  const db = await getDb();
  return db.collection<DragonShieldMonth>(COLLECTION).findOne({ month });
}

function emptyDoc(month: string, userId: string): Omit<DragonShieldMonth, "_id"> {
  const now = new Date().toISOString();
  return {
    month,
    codes: [],
    sleeve_files: { champion: null, top4: null, top16: null },
    playmat_files: { champion: null, top4: null },
    playmat_handoff: false,
    playmat_handoff_at: null,
    created_by: userId,
    modified_by: userId,
    created_at: now,
    updated_at: now,
  };
}

async function ensureDoc(month: string, userId: string): Promise<DragonShieldMonth> {
  const db = await getDb();
  const result = await db.collection<DragonShieldMonth>(COLLECTION).findOneAndUpdate(
    { month },
    { $setOnInsert: emptyDoc(month, userId) },
    { upsert: true, returnDocument: "after" }
  );
  return result!;
}

export async function loadCodes(
  month: string,
  codes: string[],
  standings: { uid: string; name: string }[],
  userId: string,
  userName: string
): Promise<DragonShieldMonth> {
  await ensureDoc(month, userId);
  const db = await getDb();

  const mappedCodes: DragonShieldCode[] = codes.map((code, i) => {
    const player = standings[i] || null;
    const placement = i + 1;
    const sleeve_tier: DragonShieldCode["sleeve_tier"] =
      placement === 1 ? "champion" : placement <= 4 ? "top4" : "top16";
    return {
      code,
      player_uid: player?.uid || null,
      player_name: player?.name || `#${placement}`,
      placement,
      sleeve_tier,
      sent: false,
      sent_at: null,
    };
  });

  const result = await db.collection<DragonShieldMonth>(COLLECTION).findOneAndUpdate(
    { month },
    { $set: { codes: mappedCodes, modified_by: userId, updated_at: new Date().toISOString() } },
    { returnDocument: "after" }
  );

  await logActivity("create", "dragon_shield_codes", month, { count: codes.length }, userId, userName);
  return result!;
}

export async function markCodeSent(
  month: string,
  index: number,
  sent: boolean,
  userId: string,
  userName: string
): Promise<DragonShieldMonth | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  const update = sent
    ? { $set: { [`codes.${index}.sent`]: true, [`codes.${index}.sent_at`]: now, modified_by: userId, updated_at: now } }
    : { $set: { [`codes.${index}.sent`]: false, [`codes.${index}.sent_at`]: null, modified_by: userId, updated_at: now } };
  const result = await db.collection<DragonShieldMonth>(COLLECTION).findOneAndUpdate(
    { month },
    update,
    { returnDocument: "after" }
  );
  if (result) {
    await logActivity("update", "dragon_shield_code", `${month}:${index}`, { sent }, userId, userName);
  }
  return result;
}

export async function markAllCodesSent(
  month: string,
  userId: string,
  userName: string
): Promise<DragonShieldMonth | null> {
  const doc = await getDragonShield(month);
  if (!doc || doc.codes.length === 0) return doc;

  const db = await getDb();
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { modified_by: userId, updated_at: now };
  doc.codes.forEach((_, i) => {
    if (!doc.codes[i].sent) {
      updates[`codes.${i}.sent`] = true;
      updates[`codes.${i}.sent_at`] = now;
    }
  });

  const result = await db.collection<DragonShieldMonth>(COLLECTION).findOneAndUpdate(
    { month },
    { $set: updates },
    { returnDocument: "after" }
  );
  await logActivity("update", "dragon_shield_codes", month, { action: "mark_all_sent" }, userId, userName);
  return result;
}

export async function setFile(
  month: string,
  fileType: "sleeve" | "playmat",
  tier: string,
  file: DragonShieldFile,
  userId: string,
  userName: string
): Promise<DragonShieldMonth> {
  await ensureDoc(month, userId);
  const db = await getDb();
  const field = fileType === "sleeve" ? `sleeve_files.${tier}` : `playmat_files.${tier}`;
  const result = await db.collection<DragonShieldMonth>(COLLECTION).findOneAndUpdate(
    { month },
    { $set: { [field]: file, modified_by: userId, updated_at: new Date().toISOString() } },
    { returnDocument: "after" }
  );
  await logActivity("update", "dragon_shield_file", `${month}:${fileType}:${tier}`, { filename: file.filename }, userId, userName);
  return result!;
}

export async function markPlaymatHandoff(
  month: string,
  handoff: boolean,
  userId: string,
  userName: string
): Promise<DragonShieldMonth | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.collection<DragonShieldMonth>(COLLECTION).findOneAndUpdate(
    { month },
    {
      $set: {
        playmat_handoff: handoff,
        playmat_handoff_at: handoff ? now : null,
        modified_by: userId,
        updated_at: now,
      },
    },
    { returnDocument: "after" }
  );
  if (result) {
    await logActivity("update", "dragon_shield_handoff", month, { handoff }, userId, userName);
  }
  return result;
}
