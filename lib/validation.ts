import { z } from "zod";

/** Allowed file extensions for media uploads */
export const ALLOWED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".pdf", ".mp4", ".mov", ".zip",
]);

/** Blocked dangerous extensions */
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".sh", ".bat", ".php", ".js", ".html", ".cmd",
  ".msi", ".ps1", ".vbs", ".wsf", ".com", ".scr",
]);

/** Extract extension from filename (lowercase) */
function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

/** Validate filename extension. Returns error string or null if valid. */
export function validateFileExtension(filename: string): string | null {
  const ext = getExtension(filename);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return `File type "${ext}" is not allowed`;
  }
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return `File type "${ext || "(none)"}" is not supported. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`;
  }
  return null;
}

/** Sanitize a filename to safe characters */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// --- Zod schemas for critical routes ---

const transactionCategory = z.enum(["subscription", "prize", "operational", "sponsorship", "other"]);

export const transactionCreateSchema = z.object({
  date: z.string().min(1),
  type: z.enum(["income", "expense"]),
  category: transactionCategory,
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  tags: z.array(z.string().max(50)).optional(),
  paid_by: z.string().max(100).optional(),
});

export const transactionUpdateSchema = z.object({
  date: z.string().min(1).optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: transactionCategory.optional(),
  description: z.string().min(1).max(500).optional(),
  amount: z.number().positive().optional(),
  tags: z.array(z.string().max(50)).optional(),
  paid_by: z.string().max(100).optional().nullable(),
  reimbursed: z.boolean().optional(),
  reimbursed_at: z.string().nullable().optional(),
});

export const prizeCreateSchema = z.object({
  month: z.string().min(1),
  category: z.enum(["mtg_single", "sponsor", "treasure_pod", "ticket", "ring", "other"]),
  name: z.string().min(1).max(200),
  value: z.number().min(0),
  recipient_type: z.enum(["placement", "most_games", "treasure_pod", "top16", "custom"]),
  recipient_name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  image_url: z.string().url().max(500).optional(),
  placement: z.number().int().optional(),
  recipient_uid: z.string().max(100).optional(),
  recipient_discord_id: z.string().max(50).optional(),
  shipping_status: z.enum(["not_applicable", "pending", "shipped", "delivered"]).optional(),
  status: z.enum(["planned", "confirmed", "awarded"]).optional(),
});

/** Whitelist for activity log filter values */
const ACTIVITY_ACTIONS = [
  "create", "update", "delete", "sync", "backfill",
  "auto_populate", "claim", "unclaim", "ship", "budget_update",
] as const;

const ACTIVITY_ENTITY_TYPES = [
  "transaction", "fixed_cost", "prize", "subscriber",
  "manual_payment", "subscription_rate", "player_identity",
  "bracket", "media", "folder", "caption_template",
  "treasure_pod", "reimbursement",
] as const;

const ERROR_LOG_LEVELS = ["error", "warn", "info"] as const;

export const errorLogFilterSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  level: z.enum(ERROR_LOG_LEVELS).optional(),
  source: z.string().max(100).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const activityFilterSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  action: z.enum(ACTIVITY_ACTIONS).optional(),
  entity_type: z.enum(ACTIVITY_ENTITY_TYPES).optional(),
  user_id: z.string().max(50).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
