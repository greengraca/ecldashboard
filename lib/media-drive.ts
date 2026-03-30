import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

const COLLECTION = "dashboard_media_files";

/** Validate and convert a string to ObjectId, throwing a descriptive error on invalid input */
function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new Error("Invalid ID format");
  return new ObjectId(id);
}

async function col() {
  const db = await getDb();
  return db.collection(COLLECTION);
}

/** Ensure indexes exist (called once on first use) */
let indexesEnsured = false;
async function ensureIndexes() {
  if (indexesEnsured) return;
  const c = await col();
  await c.createIndex({ parentId: 1, name: 1 }, { unique: true });
  await c.createIndex({ path: 1 });
  await c.createIndex({ r2Key: 1 });
  indexesEnsured = true;
}

/** Resolve name collisions: "file.png" → "file (1).png" */
async function resolveNameCollision(
  parentId: string | null,
  name: string
): Promise<string> {
  const c = await col();
  const pid = parentId ? toObjectId(parentId) : null;
  const existing = await c.findOne({ parentId: pid, name });
  if (!existing) return name;

  const dotIdx = name.lastIndexOf(".");
  const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
  const ext = dotIdx > 0 ? name.slice(dotIdx) : "";

  let counter = 1;
  let candidate = `${base} (${counter})${ext}`;
  while (await c.findOne({ parentId: pid, name: candidate })) {
    counter++;
    candidate = `${base} (${counter})${ext}`;
  }
  return candidate;
}

/** Build the materialized path for an item given its parent */
async function buildPath(
  parentId: string | null,
  name: string
): Promise<string> {
  if (!parentId) return `/${name}`;
  const c = await col();
  const parent = await c.findOne({ _id: toObjectId(parentId) });
  if (!parent) return `/${name}`;
  return `${parent.path}/${name}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(item: any) {
  return {
    ...item,
    _id: item._id.toString(),
    parentId: item.parentId?.toString() || null,
  };
}

/** Get the next sortOrder value for a given parent */
async function nextSortOrder(parentId: string | null): Promise<number> {
  const c = await col();
  const pid = parentId ? toObjectId(parentId) : null;
  const last = await c
    .find({ parentId: pid })
    .sort({ sortOrder: -1 })
    .limit(1)
    .project({ sortOrder: 1 })
    .toArray();
  return (last[0]?.sortOrder ?? -1) + 1;
}

/** List folder contents (folders first, then by sortOrder) */
export async function listFolder(parentId: string | null) {
  await ensureIndexes();
  const c = await col();
  const pid = parentId ? toObjectId(parentId) : null;
  const items = await c
    .find({ parentId: pid })
    .sort({ type: -1, sortOrder: 1, name: 1 }) // folders first, then sortOrder, then name as tiebreaker
    .toArray();
  return items.map(serialize);
}

/**
 * Batch-fetch up to 4 image r2Keys per folder.
 * Returns a map: folderId → r2Key[]
 */
export async function getFolderPreviews(
  folderIds: string[]
): Promise<Record<string, { r2Key: string; thumbR2Key?: string; _id: string }[]>> {
  if (folderIds.length === 0) return {};
  const c = await col();
  const objectIds = folderIds.map((id) => toObjectId(id));

  // Get up to 4 image files per folder using aggregation
  const pipeline = [
    {
      $match: {
        parentId: { $in: objectIds },
        type: "file",
        mimeType: { $regex: /^image\// },
        r2Key: { $exists: true },
      },
    },
    { $sort: { sortOrder: 1 as const, name: 1 as const } },
    {
      $group: {
        _id: "$parentId",
        items: {
          $push: {
            r2Key: "$r2Key",
            thumbR2Key: "$thumbR2Key",
            _id: "$_id",
          },
        },
      },
    },
    {
      $project: {
        items: { $slice: ["$items", 4] },
      },
    },
  ];

  const results = await c.aggregate(pipeline).toArray();
  const map: Record<string, { r2Key: string; thumbR2Key?: string; _id: string }[]> = {};
  for (const r of results) {
    map[r._id.toString()] = r.items.map((i: { r2Key: string; thumbR2Key?: string; _id: ObjectId }) => ({
      r2Key: i.r2Key,
      thumbR2Key: i.thumbR2Key,
      _id: i._id.toString(),
    }));
  }
  return map;
}

/** Get a single item by ID */
export async function getItem(id: string) {
  const c = await col();
  const item = await c.findOne({ _id: toObjectId(id) });
  if (!item) return null;
  return serialize(item);
}

/** Get breadcrumb chain from root to the given item */
export async function getBreadcrumbs(id: string) {
  const crumbs: { _id: string; name: string }[] = [];
  const c = await col();
  let current = await c.findOne({ _id: toObjectId(id) });
  while (current) {
    crumbs.unshift({ _id: current._id.toString(), name: current.name });
    if (!current.parentId) break;
    current = await c.findOne({ _id: current.parentId });
  }
  return crumbs;
}

/** Create a new folder */
export async function createFolder(
  name: string,
  parentId: string | null,
  uploadedBy: string
) {
  await ensureIndexes();
  const resolvedName = await resolveNameCollision(parentId, name);
  const path = await buildPath(parentId, resolvedName);
  const c = await col();
  const now = new Date();
  const sortOrder = await nextSortOrder(parentId);
  const doc = {
    name: resolvedName,
    type: "folder" as const,
    parentId: parentId ? toObjectId(parentId) : null,
    path,
    sortOrder,
    uploadedBy,
    createdAt: now,
    updatedAt: now,
  };
  const result = await c.insertOne(doc);
  return { ...doc, _id: result.insertedId.toString(), parentId };
}

/** Create metadata for an uploaded file */
export async function createFileMetadata(params: {
  name: string;
  parentId: string | null;
  mimeType: string;
  size: number;
  r2Key: string;
  thumbR2Key?: string;
  uploadedBy: string;
}) {
  await ensureIndexes();
  const resolvedName = await resolveNameCollision(params.parentId, params.name);
  const path = await buildPath(params.parentId, resolvedName);
  const c = await col();
  const now = new Date();
  const sortOrder = await nextSortOrder(params.parentId);
  const doc = {
    name: resolvedName,
    type: "file" as const,
    mimeType: params.mimeType,
    size: params.size,
    r2Key: params.r2Key,
    ...(params.thumbR2Key ? { thumbR2Key: params.thumbR2Key } : {}),
    parentId: params.parentId ? toObjectId(params.parentId) : null,
    path,
    sortOrder,
    uploadedBy: params.uploadedBy,
    createdAt: now,
    updatedAt: now,
  };
  const result = await c.insertOne(doc);
  return {
    ...doc,
    _id: result.insertedId.toString(),
    parentId: params.parentId,
  };
}

/** Rename an item — updates its path and all descendants' paths */
export async function renameItem(id: string, newName: string) {
  const c = await col();
  const item = await c.findOne({ _id: toObjectId(id) });
  if (!item) throw new Error("Item not found");

  const resolvedName = await resolveNameCollision(
    item.parentId?.toString() || null,
    newName
  );
  const oldPath = item.path as string;
  const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"));
  const newPath = `${parentPath}/${resolvedName}`;

  await c.updateOne(
    { _id: toObjectId(id) },
    { $set: { name: resolvedName, path: newPath, updatedAt: new Date() } }
  );

  if (item.type === "folder") {
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const descendants = await c
      .find({ path: { $regex: `^${escapedOldPath}/` } })
      .toArray();
    if (descendants.length > 0) {
      const now = new Date();
      const ops = descendants.map((desc) => ({
        updateOne: {
          filter: { _id: desc._id },
          update: {
            $set: {
              path: newPath + (desc.path as string).substring(oldPath.length),
              updatedAt: now,
            },
          },
        },
      }));
      await c.bulkWrite(ops);
    }
  }

  return serialize({
    ...item,
    name: resolvedName,
    path: newPath,
  });
}

/** Move an item to a new parent folder */
export async function moveItem(id: string, newParentId: string | null) {
  const c = await col();
  const item = await c.findOne({ _id: toObjectId(id) });
  if (!item) throw new Error("Item not found");

  const resolvedName = await resolveNameCollision(newParentId, item.name);
  const oldPath = item.path as string;
  const newPath = await buildPath(newParentId, resolvedName);
  const newPid = newParentId ? toObjectId(newParentId) : null;

  await c.updateOne(
    { _id: toObjectId(id) },
    {
      $set: {
        name: resolvedName,
        parentId: newPid,
        path: newPath,
        updatedAt: new Date(),
      },
    }
  );

  if (item.type === "folder") {
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const descendants = await c
      .find({ path: { $regex: `^${escapedOldPath}/` } })
      .toArray();
    if (descendants.length > 0) {
      const now = new Date();
      const ops = descendants.map((desc) => ({
        updateOne: {
          filter: { _id: desc._id },
          update: {
            $set: {
              path: newPath + (desc.path as string).substring(oldPath.length),
              updatedAt: now,
            },
          },
        },
      }));
      await c.bulkWrite(ops);
    }
  }

  return serialize({
    ...item,
    name: resolvedName,
    parentId: newParentId,
    path: newPath,
  });
}

/** Collect R2 keys for an item (and descendants if folder). Does NOT delete anything. */
export async function collectR2Keys(id: string): Promise<string[]> {
  const c = await col();
  const item = await c.findOne({ _id: toObjectId(id) });
  if (!item) throw new Error("Item not found");

  const r2Keys: string[] = [];
  if (item.type === "file") {
    if (item.r2Key) r2Keys.push(item.r2Key);
    if (item.thumbR2Key) r2Keys.push(item.thumbR2Key);
  } else {
    const escapedPath = (item.path as string).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    const descendants = await c
      .find({ path: { $regex: `^${escapedPath}/` }, r2Key: { $exists: true } })
      .project({ r2Key: 1, thumbR2Key: 1 })
      .toArray();
    for (const desc of descendants) {
      if (desc.r2Key) r2Keys.push(desc.r2Key);
      if (desc.thumbR2Key) r2Keys.push(desc.thumbR2Key);
    }
  }
  return r2Keys;
}

/** Delete item from DB (and descendants if folder). Call AFTER R2 deletion. */
export async function deleteItemFromDb(id: string): Promise<void> {
  const c = await col();
  const item = await c.findOne({ _id: toObjectId(id) });
  if (!item) throw new Error("Item not found");

  if (item.type === "folder") {
    const escapedPath = (item.path as string).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    await c.deleteMany({ path: { $regex: `^${escapedPath}/` } });
  }
  await c.deleteOne({ _id: toObjectId(id) });
}

/**
 * Reorder an item within its current folder.
 * Places the item after `afterId` (null = move to first position).
 * Folders and files are reordered within their own group.
 */
export async function reorderItem(
  id: string,
  afterId: string | null
): Promise<void> {
  const c = await col();
  const item = await c.findOne({ _id: toObjectId(id) });
  if (!item) throw new Error("Item not found");

  // Get all siblings of the same type in order
  const siblings = await c
    .find({ parentId: item.parentId, type: item.type })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();

  // Build the new ordered list
  const filtered = siblings.filter((s) => !s._id.equals(toObjectId(id)));

  let insertIdx: number;
  if (afterId === null) {
    insertIdx = 0;
  } else {
    const afterIdx = filtered.findIndex((s) =>
      s._id.equals(toObjectId(afterId))
    );
    insertIdx = afterIdx === -1 ? filtered.length : afterIdx + 1;
  }

  filtered.splice(insertIdx, 0, item);

  // Reassign sortOrder for the group
  const bulkOps = filtered.map((s, i) => ({
    updateOne: {
      filter: { _id: s._id },
      update: { $set: { sortOrder: i, updatedAt: new Date() } },
    },
  }));
  if (bulkOps.length > 0) {
    await c.bulkWrite(bulkOps);
  }
}

/** Find or create a root-level folder by name. Returns its _id as a string. */
export async function ensureFolder(
  name: string,
  uploadedBy: string
): Promise<string> {
  await ensureIndexes();
  const c = await col();
  const existing = await c.findOne({ parentId: null, type: "folder", name });
  if (existing) return existing._id.toString();

  const path = `/${name}`;
  const now = new Date();
  const sortOrder = await nextSortOrder(null);
  const doc = {
    name,
    type: "folder" as const,
    parentId: null,
    path,
    sortOrder,
    uploadedBy,
    createdAt: now,
    updatedAt: now,
  };
  const result = await c.insertOne(doc);
  return result.insertedId.toString();
}

/** Check which required asset names exist in the drive (by filename match) */
export async function checkAssetStatus(requiredNames: string[]) {
  const c = await col();
  const found = await c
    .find({ type: "file", name: { $in: requiredNames } })
    .project({ name: 1 })
    .toArray();
  const foundSet = new Set(found.map((f) => f.name));
  return requiredNames.map((name) => ({
    name,
    exists: foundSet.has(name),
  }));
}
