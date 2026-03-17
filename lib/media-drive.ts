import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

const COLLECTION = "dashboard_media_files";

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
  const pid = parentId ? new ObjectId(parentId) : null;
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
  const parent = await c.findOne({ _id: new ObjectId(parentId) });
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
  const pid = parentId ? new ObjectId(parentId) : null;
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
  const pid = parentId ? new ObjectId(parentId) : null;
  const items = await c
    .find({ parentId: pid })
    .sort({ type: -1, sortOrder: 1, name: 1 }) // folders first, then sortOrder, then name as tiebreaker
    .toArray();
  return items.map(serialize);
}

/** Get a single item by ID */
export async function getItem(id: string) {
  const c = await col();
  const item = await c.findOne({ _id: new ObjectId(id) });
  if (!item) return null;
  return serialize(item);
}

/** Get breadcrumb chain from root to the given item */
export async function getBreadcrumbs(id: string) {
  const crumbs: { _id: string; name: string }[] = [];
  const c = await col();
  let current = await c.findOne({ _id: new ObjectId(id) });
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
    parentId: parentId ? new ObjectId(parentId) : null,
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
    parentId: params.parentId ? new ObjectId(params.parentId) : null,
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
  const item = await c.findOne({ _id: new ObjectId(id) });
  if (!item) throw new Error("Item not found");

  const resolvedName = await resolveNameCollision(
    item.parentId?.toString() || null,
    newName
  );
  const oldPath = item.path as string;
  const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"));
  const newPath = `${parentPath}/${resolvedName}`;

  await c.updateOne(
    { _id: new ObjectId(id) },
    { $set: { name: resolvedName, path: newPath, updatedAt: new Date() } }
  );

  if (item.type === "folder") {
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const descendants = await c
      .find({ path: { $regex: `^${escapedOldPath}/` } })
      .toArray();
    for (const desc of descendants) {
      const updatedPath =
        newPath + (desc.path as string).substring(oldPath.length);
      await c.updateOne(
        { _id: desc._id },
        { $set: { path: updatedPath, updatedAt: new Date() } }
      );
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
  const item = await c.findOne({ _id: new ObjectId(id) });
  if (!item) throw new Error("Item not found");

  const resolvedName = await resolveNameCollision(newParentId, item.name);
  const oldPath = item.path as string;
  const newPath = await buildPath(newParentId, resolvedName);
  const newPid = newParentId ? new ObjectId(newParentId) : null;

  await c.updateOne(
    { _id: new ObjectId(id) },
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
    for (const desc of descendants) {
      const updatedPath =
        newPath + (desc.path as string).substring(oldPath.length);
      await c.updateOne(
        { _id: desc._id },
        { $set: { path: updatedPath, updatedAt: new Date() } }
      );
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
  const item = await c.findOne({ _id: new ObjectId(id) });
  if (!item) throw new Error("Item not found");

  const r2Keys: string[] = [];
  if (item.type === "file") {
    if (item.r2Key) r2Keys.push(item.r2Key);
  } else {
    const escapedPath = (item.path as string).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    const descendants = await c
      .find({ path: { $regex: `^${escapedPath}/` }, r2Key: { $exists: true } })
      .project({ r2Key: 1 })
      .toArray();
    for (const desc of descendants) {
      if (desc.r2Key) r2Keys.push(desc.r2Key);
    }
  }
  return r2Keys;
}

/** Delete item from DB (and descendants if folder). Call AFTER R2 deletion. */
export async function deleteItemFromDb(id: string): Promise<void> {
  const c = await col();
  const item = await c.findOne({ _id: new ObjectId(id) });
  if (!item) throw new Error("Item not found");

  if (item.type === "folder") {
    const escapedPath = (item.path as string).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    await c.deleteMany({ path: { $regex: `^${escapedPath}/` } });
  }
  await c.deleteOne({ _id: new ObjectId(id) });
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
  const item = await c.findOne({ _id: new ObjectId(id) });
  if (!item) throw new Error("Item not found");

  // Get all siblings of the same type in order
  const siblings = await c
    .find({ parentId: item.parentId, type: item.type })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();

  // Build the new ordered list
  const filtered = siblings.filter((s) => !s._id.equals(new ObjectId(id)));

  let insertIdx: number;
  if (afterId === null) {
    insertIdx = 0;
  } else {
    const afterIdx = filtered.findIndex((s) =>
      s._id.equals(new ObjectId(afterId))
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
