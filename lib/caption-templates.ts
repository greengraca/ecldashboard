import { getDb } from "./mongodb";

const COLLECTION = "dashboard_caption_templates";

export interface CaptionTemplateDoc {
  templateId: string;
  captionTemplate: string;
  updatedAt: Date;
  updatedBy: string;
}

export async function getAllCaptionTemplates(): Promise<Record<string, string>> {
  const db = await getDb();
  const docs = await db.collection<CaptionTemplateDoc>(COLLECTION).find().toArray();
  const map: Record<string, string> = {};
  for (const doc of docs) {
    map[doc.templateId] = doc.captionTemplate;
  }
  return map;
}

export async function upsertCaptionTemplate(
  templateId: string,
  captionTemplate: string,
  userId: string,
): Promise<void> {
  const db = await getDb();
  await db.collection<CaptionTemplateDoc>(COLLECTION).updateOne(
    { templateId },
    { $set: { captionTemplate, updatedAt: new Date(), updatedBy: userId } },
    { upsert: true },
  );
}

export async function deleteCaptionTemplate(templateId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<CaptionTemplateDoc>(COLLECTION).deleteOne({ templateId });
  return result.deletedCount > 0;
}
