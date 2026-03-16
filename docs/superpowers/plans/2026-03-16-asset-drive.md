# Asset Drive Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Google Drive-like file manager in the media tab using Cloudflare R2 for blob storage and MongoDB for metadata, with full folder hierarchy, drag-and-drop (upload, move, template integration), inline preview, and asset status warnings.

**Architecture:** Cloudflare R2 stores file blobs via S3-compatible API. MongoDB collection `dashboard_media_files` stores metadata and folder hierarchy using materialized paths. Dual upload path: server proxy for <4MB files, presigned URLs for larger files to bypass Vercel's 4.5MB body limit. UI replaces the existing AssetStatus panel.

**Tech Stack:** Next.js 16 App Router, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, MongoDB Node.js driver, SWR, lucide-react, HTML5 Drag and Drop API.

**Spec:** `docs/superpowers/specs/2026-03-16-asset-drive-design.md`

---

## Chunk 1: Foundation (R2 client, types, DB lib, core API routes)

### Task 1: Install dependencies and add MediaFile type

**Files:**
- Modify: `package.json` (add AWS SDK packages)
- Modify: `lib/types.ts` (add MediaFile interface at the end, after existing types)

- [ ] **Step 1: Install AWS SDK packages**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Add MediaFile interface to `lib/types.ts`**

Append after the last interface in the file:

```typescript
// ─── Media Drive Types ───

export interface MediaFile {
  _id: string;
  name: string;
  type: "file" | "folder";
  mimeType?: string;
  size?: number;
  r2Key?: string;
  parentId: string | null;
  path: string;
  previewUrl?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json lib/types.ts
git commit -m "feat(drive): install AWS SDK and add MediaFile type"
```

---

### Task 2: Create R2 client singleton (`lib/r2.ts`)

**Files:**
- Create: `lib/r2.ts`

Follow the exact same lazy singleton pattern as `lib/mongodb.ts` (globalThis cache, lazy init, build-safe without env vars).

- [ ] **Step 1: Create `lib/r2.ts`**

```typescript
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface R2Cache {
  client: S3Client | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _r2Cache: R2Cache | undefined;
}

const cached: R2Cache = globalThis._r2Cache ?? { client: null };
if (!globalThis._r2Cache) globalThis._r2Cache = cached;

function getClient(): S3Client {
  if (cached.client) return cached.client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
  }

  cached.client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return cached.client;
}

function bucket(): string {
  return process.env.R2_BUCKET_NAME || "ecl-media";
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ContentType: contentType,
    })
  );
}

export async function deleteFromR2(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key })
  );
}

export async function deleteManyFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  // DeleteObjects supports max 1000 keys per request
  const chunks = [];
  for (let i = 0; i < keys.length; i += 1000) {
    chunks.push(keys.slice(i, i + 1000));
  }
  for (const chunk of chunks) {
    await getClient().send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      })
    );
  }
}

export async function headR2Object(key: string): Promise<boolean> {
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn }
  );
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 900
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/r2.ts
git commit -m "feat(drive): add R2 client singleton with upload/download/presign helpers"
```

---

### Task 3: Create MongoDB CRUD lib (`lib/media-drive.ts`)

**Files:**
- Create: `lib/media-drive.ts`

All MongoDB operations for the `dashboard_media_files` collection. Handles folder listing, creation, renaming, moving, deletion (with recursive), and name collision resolution.

- [ ] **Step 1: Create `lib/media-drive.ts`**

```typescript
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
async function buildPath(parentId: string | null, name: string): Promise<string> {
  if (!parentId) return `/${name}`;
  const c = await col();
  const parent = await c.findOne({ _id: new ObjectId(parentId) });
  if (!parent) return `/${name}`;
  return `${parent.path}/${name}`;
}

/** List folder contents (folders first, then alphabetical) */
export async function listFolder(parentId: string | null) {
  await ensureIndexes();
  const c = await col();
  const pid = parentId ? new ObjectId(parentId) : null;
  const items = await c
    .find({ parentId: pid })
    .sort({ type: -1, name: 1 }) // "folder" > "file" alphabetically, so -1 puts folders first
    .toArray();
  return items.map((item) => ({
    ...item,
    _id: item._id.toString(),
    parentId: item.parentId?.toString() || null,
  }));
}

/** Get a single item by ID */
export async function getItem(id: string) {
  const c = await col();
  const item = await c.findOne({ _id: new ObjectId(id) });
  if (!item) return null;
  return {
    ...item,
    _id: item._id.toString(),
    parentId: item.parentId?.toString() || null,
  };
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
  const doc = {
    name: resolvedName,
    type: "folder" as const,
    parentId: parentId ? new ObjectId(parentId) : null,
    path,
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
  const doc = {
    name: resolvedName,
    type: "file" as const,
    mimeType: params.mimeType,
    size: params.size,
    r2Key: params.r2Key,
    parentId: params.parentId ? new ObjectId(params.parentId) : null,
    path,
    uploadedBy: params.uploadedBy,
    createdAt: now,
    updatedAt: now,
  };
  const result = await c.insertOne(doc);
  return { ...doc, _id: result.insertedId.toString(), parentId: params.parentId };
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
  const oldPath = item.path;
  const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"));
  const newPath = `${parentPath}/${resolvedName}`;

  // Update item itself
  await c.updateOne(
    { _id: new ObjectId(id) },
    { $set: { name: resolvedName, path: newPath, updatedAt: new Date() } }
  );

  // Update all descendants' paths
  if (item.type === "folder") {
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const descendants = await c
      .find({ path: { $regex: `^${escapedOldPath}/` } })
      .toArray();
    for (const desc of descendants) {
      const updatedPath = newPath + desc.path.substring(oldPath.length);
      await c.updateOne(
        { _id: desc._id },
        { $set: { path: updatedPath, updatedAt: new Date() } }
      );
    }
  }

  return { ...item, _id: id, name: resolvedName, path: newPath };
}

/** Move an item to a new parent folder */
export async function moveItem(id: string, newParentId: string | null) {
  const c = await col();
  const item = await c.findOne({ _id: new ObjectId(id) });
  if (!item) throw new Error("Item not found");

  const resolvedName = await resolveNameCollision(newParentId, item.name);
  const oldPath = item.path;
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

  // Update descendants
  if (item.type === "folder") {
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const descendants = await c
      .find({ path: { $regex: `^${escapedOldPath}/` } })
      .toArray();
    for (const desc of descendants) {
      const updatedPath = newPath + desc.path.substring(oldPath.length);
      await c.updateOne(
        { _id: desc._id },
        { $set: { path: updatedPath, updatedAt: new Date() } }
      );
    }
  }

  return { ...item, _id: id, name: resolvedName, parentId: newParentId, path: newPath };
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
    const escapedPath = item.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const escapedPath = item.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await c.deleteMany({ path: { $regex: `^${escapedPath}/` } });
  }
  await c.deleteOne({ _id: new ObjectId(id) });
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/media-drive.ts
git commit -m "feat(drive): add MongoDB CRUD lib for dashboard_media_files"
```

---

### Task 4: API route — list folder + create folder (`/api/media/drive`)

**Files:**
- Create: `app/api/media/drive/route.ts`

- [ ] **Step 1: Create `app/api/media/drive/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listFolder, createFolder } from "@/lib/media-drive";
import { getPresignedDownloadUrl } from "@/lib/r2";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId") || null;

    const items = await listFolder(parentId);

    // Return breadcrumbs for the current folder (avoids N+1 client-side fetches)
    let breadcrumbs: { _id: string; name: string }[] = [];
    if (parentId) {
      const { getBreadcrumbs } = await import("@/lib/media-drive");
      breadcrumbs = await getBreadcrumbs(parentId);
    }

    // Batch-generate presigned preview URLs for image files
    const withPreviews = await Promise.all(
      items.map(async (item) => {
        if (
          item.type === "file" &&
          item.r2Key &&
          item.mimeType?.startsWith("image/")
        ) {
          try {
            const previewUrl = await getPresignedDownloadUrl(item.r2Key, 3600);
            return { ...item, previewUrl };
          } catch {
            return item;
          }
        }
        return item;
      })
    );

    return NextResponse.json({ data: withPreviews, breadcrumbs });
  } catch (err) {
    console.error("GET /api/media/drive error:", err);
    return NextResponse.json(
      { error: "Failed to list folder" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";
    const folder = await createFolder(name.trim(), parentId || null, userName);

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (err) {
    console.error("POST /api/media/drive error:", err);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/media/drive/route.ts
git commit -m "feat(drive): add list folder + create folder API route"
```

---

### Task 5: API route — small file upload (`/api/media/drive/upload`)

**Files:**
- Create: `app/api/media/drive/upload/route.ts`

- [ ] **Step 1: Create `app/api/media/drive/upload/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { uploadToR2 } from "@/lib/r2";
import { createFileMetadata } from "@/lib/media-drive";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parentId = (formData.get("parentId") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 4MB limit for server-side proxy
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large for direct upload. Use presigned URL flow for files >= 4MB." },
        { status: 413 }
      );
    }

    const r2Key = `media/${randomUUID()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadToR2(r2Key, buffer, file.type || "application/octet-stream");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";

    const metadata = await createFileMetadata({
      name: file.name,
      parentId,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      r2Key,
      uploadedBy: userName,
    });

    return NextResponse.json({ data: metadata }, { status: 201 });
  } catch (err) {
    console.error("POST /api/media/drive/upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/media/drive/upload/route.ts
git commit -m "feat(drive): add small file upload API route (<4MB)"
```

---

### Task 6: API routes — presigned upload URL + confirm (`/api/media/drive/upload-url` and `/api/media/drive/upload-confirm`)

**Files:**
- Create: `app/api/media/drive/upload-url/route.ts`
- Create: `app/api/media/drive/upload-confirm/route.ts`

- [ ] **Step 1: Create `app/api/media/drive/upload-url/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { getPresignedUploadUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, mimeType, size } = body;

    if (!name || !mimeType) {
      return NextResponse.json(
        { error: "name and mimeType are required" },
        { status: 400 }
      );
    }

    if (size && size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 100MB limit" },
        { status: 413 }
      );
    }

    const r2Key = `media/${randomUUID()}-${name}`;
    const uploadUrl = await getPresignedUploadUrl(r2Key, mimeType, 900);

    return NextResponse.json({ data: { uploadUrl, r2Key } });
  } catch (err) {
    console.error("POST /api/media/drive/upload-url error:", err);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create `app/api/media/drive/upload-confirm/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headR2Object } from "@/lib/r2";
import { createFileMetadata } from "@/lib/media-drive";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { r2Key, name, parentId, size, mimeType } = body;

    if (!r2Key || !name || !mimeType) {
      return NextResponse.json(
        { error: "r2Key, name, and mimeType are required" },
        { status: 400 }
      );
    }

    // Verify the object actually exists in R2
    const exists = await headR2Object(r2Key);
    if (!exists) {
      return NextResponse.json(
        { error: "R2 object not found — upload may have failed" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session.user as any).username || session.user.name || "unknown";

    const metadata = await createFileMetadata({
      name,
      parentId: parentId || null,
      mimeType,
      size: size || 0,
      r2Key,
      uploadedBy: userName,
    });

    return NextResponse.json({ data: metadata }, { status: 201 });
  } catch (err) {
    console.error("POST /api/media/drive/upload-confirm error:", err);
    return NextResponse.json(
      { error: "Failed to confirm upload" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/media/drive/upload-url/route.ts app/api/media/drive/upload-confirm/route.ts
git commit -m "feat(drive): add presigned upload URL + confirm routes for large files"
```

---

### Task 7: API route — get, rename, move, delete (`/api/media/drive/[id]`)

**Files:**
- Create: `app/api/media/drive/[id]/route.ts`

- [ ] **Step 1: Create `app/api/media/drive/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getItem, renameItem, moveItem, collectR2Keys, deleteItemFromDb } from "@/lib/media-drive";
import { deleteManyFromR2 } from "@/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getItem(id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error("GET /api/media/drive/[id] error:", err);
    return NextResponse.json({ error: "Failed to get item" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Move operation
    if ("parentId" in body) {
      const result = await moveItem(id, body.parentId);
      return NextResponse.json({ data: result });
    }

    // Rename operation
    if ("name" in body && typeof body.name === "string") {
      const result = await renameItem(id, body.name.trim());
      return NextResponse.json({ data: result });
    }

    return NextResponse.json(
      { error: "Provide 'name' or 'parentId' to update" },
      { status: 400 }
    );
  } catch (err) {
    console.error("PATCH /api/media/drive/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Collect R2 keys first
    const r2Keys = await collectR2Keys(id);

    // Delete from R2 FIRST (spec requirement: R2 before DB)
    // If R2 fails, metadata stays intact for retry
    if (r2Keys.length > 0) {
      await deleteManyFromR2(r2Keys);
    }

    // Only delete from DB after R2 succeeds
    await deleteItemFromDb(id);

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /api/media/drive/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/media/drive/\\[id\\]/route.ts
git commit -m "feat(drive): add get/rename/move/delete API route"
```

---

### Task 8: API routes — download, preview, asset-status

**Files:**
- Create: `app/api/media/drive/[id]/download/route.ts`
- Create: `app/api/media/drive/[id]/preview/route.ts`
- Create: `app/api/media/drive/asset-status/route.ts`

- [ ] **Step 1: Create `app/api/media/drive/[id]/download/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getItem } from "@/lib/media-drive";
import { getPresignedDownloadUrl } from "@/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getItem(id);

    if (!item || item.type !== "file" || !item.r2Key) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const url = await getPresignedDownloadUrl(item.r2Key, 3600);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("GET /api/media/drive/[id]/download error:", err);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create `app/api/media/drive/[id]/preview/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getItem } from "@/lib/media-drive";
import { getPresignedDownloadUrl } from "@/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getItem(id);

    if (!item || item.type !== "file" || !item.r2Key) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const url = await getPresignedDownloadUrl(item.r2Key, 3600);
    return NextResponse.json({ data: { previewUrl: url } });
  } catch (err) {
    console.error("GET /api/media/drive/[id]/preview error:", err);
    return NextResponse.json(
      { error: "Failed to generate preview URL" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create `app/api/media/drive/asset-status/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { REQUIRED_ASSETS } from "@/components/media/shared/brand-constants";
import { checkAssetStatus } from "@/lib/media-drive";

export async function GET() {
  try {
    const requiredNames = REQUIRED_ASSETS.map((a) =>
      a.path.split("/").pop()!
    );
    const status = await checkAssetStatus(requiredNames);

    // Map back to full REQUIRED_ASSETS info
    const results = REQUIRED_ASSETS.map((asset, i) => ({
      key: asset.key,
      label: asset.label,
      path: asset.path,
      exists: status[i].exists,
    }));

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("GET /api/media/drive/asset-status error:", err);
    return NextResponse.json(
      { error: "Failed to check asset status" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/media/drive/\\[id\\]/download/route.ts app/api/media/drive/\\[id\\]/preview/route.ts app/api/media/drive/asset-status/route.ts
git commit -m "feat(drive): add download, preview, and asset-status API routes"
```

- [ ] **Step 5: Verify build compiles**

```bash
npm run build
```

Expected: Build succeeds (R2 env vars not needed at build time due to lazy init).

---

## Chunk 2: UI Components (file browser, drag-and-drop, preview)

### Task 9: AssetWarningBar component

**Files:**
- Create: `components/media/drive/AssetWarningBar.tsx`

Replaces the warning portion of the old AssetStatus component. Fetches from `/api/media/drive/asset-status` instead of doing HEAD requests to `public/` paths.

- [ ] **Step 1: Create `components/media/drive/AssetWarningBar.tsx`**

```typescript
"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AssetCheck {
  key: string;
  label: string;
  path: string;
  exists: boolean;
}

export default function AssetWarningBar() {
  const { data, isLoading } = useSWR("/api/media/drive/asset-status", fetcher);
  const [expanded, setExpanded] = useState(false);

  const assets: AssetCheck[] = data?.data || [];
  const missing = assets.filter((a) => !a.exists);
  const allGood = missing.length === 0 && !isLoading;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: allGood
          ? "rgba(34, 197, 94, 0.3)"
          : "rgba(234, 179, 8, 0.3)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div
              className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--accent)",
              }}
            />
          ) : allGood ? (
            <CheckCircle
              className="w-4 h-4"
              style={{ color: "rgb(34, 197, 94)" }}
            />
          ) : (
            <AlertCircle
              className="w-4 h-4"
              style={{ color: "rgb(234, 179, 8)" }}
            />
          )}
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Brand Assets
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isLoading
              ? "Checking..."
              : allGood
                ? "All assets in drive"
                : `${missing.length} missing — upload to drive`}
          </span>
        </div>
        {expanded ? (
          <ChevronUp
            className="w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
        ) : (
          <ChevronDown
            className="w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
        )}
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 space-y-2 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <p
            className="text-xs mt-3 mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Upload these brand assets to the drive for templates to detect them.
          </p>
          {assets.map((asset) => (
            <div
              key={asset.key}
              className="flex items-center gap-2 text-xs py-1"
            >
              {asset.exists ? (
                <CheckCircle
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: "rgb(34, 197, 94)" }}
                />
              ) : (
                <AlertCircle
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: "rgb(234, 179, 8)" }}
                />
              )}
              <span
                style={{
                  color: asset.exists
                    ? "var(--text-secondary)"
                    : "var(--text-primary)",
                }}
              >
                {asset.label}
              </span>
              <span
                className="ml-auto"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                  fontSize: 10,
                }}
              >
                {asset.path.split("/").pop()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/media/drive/AssetWarningBar.tsx
git commit -m "feat(drive): add AssetWarningBar component"
```

---

### Task 10: DriveToolbar component

**Files:**
- Create: `components/media/drive/DriveToolbar.tsx`

Breadcrumbs with clickable segments, view toggle (grid/list), "New Folder" and "Upload" buttons. Breadcrumb items are drop targets for move operations.

- [ ] **Step 1: Create `components/media/drive/DriveToolbar.tsx`**

```typescript
"use client";

import { useRef } from "react";
import {
  FolderPlus,
  Upload,
  LayoutGrid,
  List,
  ChevronRight,
  Home,
} from "lucide-react";

interface Breadcrumb {
  _id: string;
  name: string;
}

interface DriveToolbarProps {
  breadcrumbs: Breadcrumb[];
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onNavigate: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onUploadFiles: (files: FileList) => void;
  onMoveToFolder: (itemId: string, targetFolderId: string | null) => void;
}

export default function DriveToolbar({
  breadcrumbs,
  viewMode,
  onViewModeChange,
  onNavigate,
  onCreateFolder,
  onUploadFiles,
  onMoveToFolder,
}: DriveToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/x-drive-move")) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).style.outline = "1px solid var(--accent)";
      (e.currentTarget as HTMLElement).style.borderRadius = "6px";
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).style.outline = "none";
  }

  function handleDrop(e: React.DragEvent, targetFolderId: string | null) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.outline = "none";
    const itemId = e.dataTransfer.getData("application/x-drive-move");
    if (itemId) {
      onMoveToFolder(itemId, targetFolderId);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm min-w-0 overflow-x-auto">
        <button
          onClick={() => onNavigate(null)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className="flex items-center gap-1 px-2 py-1 rounded hover:opacity-80 transition-opacity flex-shrink-0"
          style={{
            color: breadcrumbs.length === 0 ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Drive</span>
        </button>

        {breadcrumbs.map((crumb, i) => (
          <div key={crumb._id} className="flex items-center gap-1 flex-shrink-0">
            <ChevronRight
              className="w-3 h-3"
              style={{ color: "var(--text-muted)" }}
            />
            <button
              onClick={() => onNavigate(crumb._id)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, crumb._id)}
              className="px-2 py-1 rounded hover:opacity-80 transition-opacity"
              style={{
                color:
                  i === breadcrumbs.length - 1
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
              }}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() =>
            onViewModeChange(viewMode === "grid" ? "list" : "grid")
          }
          className="p-2 rounded-lg transition-colors"
          style={{
            color: "var(--text-secondary)",
            background: "var(--bg-hover)",
          }}
          title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
        >
          {viewMode === "grid" ? (
            <List className="w-4 h-4" />
          ) : (
            <LayoutGrid className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onCreateFolder}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            color: "var(--text-secondary)",
            background: "var(--bg-hover)",
          }}
        >
          <FolderPlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Folder</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
          }}
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/media/drive/DriveToolbar.tsx
git commit -m "feat(drive): add DriveToolbar with breadcrumbs, view toggle, actions"
```

---

### Task 11: DriveFolderCard and DriveFileCard components

**Files:**
- Create: `components/media/drive/DriveFolderCard.tsx`
- Create: `components/media/drive/DriveFileCard.tsx`

Both are draggable (for move operations). FolderCard is also a drop target. FileCard sets `application/x-drive-asset` for template editor integration.

- [ ] **Step 1: Create `components/media/drive/DriveFolderCard.tsx`**

```typescript
"use client";

import { useState } from "react";
import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { MediaFile } from "@/lib/types";

interface DriveFolderCardProps {
  item: MediaFile;
  viewMode: "grid" | "list";
  onNavigate: (folderId: string) => void;
  onDrop: (itemId: string, targetFolderId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string, name: string) => void;
}

export default function DriveFolderCard({
  item,
  viewMode,
  onNavigate,
  onDrop,
  onRename,
  onDelete,
}: DriveFolderCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/x-drive-move", item._id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/x-drive-move")) {
      e.preventDefault();
      setDragOver(true);
    }
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDropOnFolder(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const itemId = e.dataTransfer.getData("application/x-drive-move");
    if (itemId && itemId !== item._id) {
      onDrop(itemId, item._id);
    }
  }

  if (viewMode === "list") {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnFolder}
        onClick={() => onNavigate(item._id)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group"
        style={{
          background: dragOver ? "var(--accent-light)" : "transparent",
          borderColor: dragOver ? "var(--accent)" : "transparent",
        }}
      >
        <Folder
          className="w-5 h-5 flex-shrink-0"
          style={{ color: "var(--accent)" }}
        />
        <span
          className="flex-1 text-sm truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Folder
        </span>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <ContextMenu
              onRename={() => {
                setShowMenu(false);
                onRename(item._id, item.name);
              }}
              onDelete={() => {
                setShowMenu(false);
                onDelete(item._id, item.name);
              }}
              onClose={() => setShowMenu(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropOnFolder}
      onDoubleClick={() => onNavigate(item._id)}
      className="flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all group relative"
      style={{
        background: dragOver ? "var(--accent-light)" : "var(--bg-card)",
        borderColor: dragOver ? "var(--accent)" : "var(--border)",
        minHeight: 120,
      }}
    >
      <Folder
        className="w-10 h-10 mb-2"
        style={{ color: "var(--accent)" }}
      />
      <span
        className="text-xs text-center truncate w-full"
        style={{ color: "var(--text-primary)" }}
      >
        {item.name}
      </span>
      <div className="absolute top-2 right-2">
        <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
        {showMenu && (
          <ContextMenu
            onRename={() => {
              setShowMenu(false);
              onRename(item._id, item.name);
            }}
            onDelete={() => {
              setShowMenu(false);
              onDelete(item._id, item.name);
            }}
            onClose={() => setShowMenu(false)}
          />
        )}
        </div>
      </div>
    </div>
  );
}

function ContextMenu({
  onRename,
  onDelete,
  onClose,
}: {
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg py-1 min-w-[140px]"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <button
          onClick={onRename}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80"
          style={{ color: "var(--text-primary)" }}
        >
          <Pencil className="w-3.5 h-3.5" />
          Rename
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80"
          style={{ color: "var(--error)" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `components/media/drive/DriveFileCard.tsx`**

```typescript
"use client";

import { useState } from "react";
import {
  FileImage,
  FileVideo,
  File,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import type { MediaFile } from "@/lib/types";

interface DriveFileCardProps {
  item: MediaFile;
  viewMode: "grid" | "list";
  onClick: (item: MediaFile) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string, name: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function FileIcon({ mimeType }: { mimeType?: string }) {
  if (mimeType?.startsWith("image/"))
    return <FileImage className="w-5 h-5" style={{ color: "var(--accent)" }} />;
  if (mimeType?.startsWith("video/"))
    return <FileVideo className="w-5 h-5" style={{ color: "#a78bfa" }} />;
  return <File className="w-5 h-5" style={{ color: "var(--text-muted)" }} />;
}

export default function DriveFileCard({
  item,
  viewMode,
  onClick,
  onRename,
  onDelete,
}: DriveFileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isImage = item.mimeType?.startsWith("image/");

  function handleDragStart(e: React.DragEvent) {
    // For move within drive
    e.dataTransfer.setData("application/x-drive-move", item._id);
    // For drag-to-template-editor
    if (item.previewUrl) {
      e.dataTransfer.setData(
        "application/x-drive-asset",
        JSON.stringify({
          id: item._id,
          previewUrl: item.previewUrl,
          name: item.name,
        })
      );
    }
    e.dataTransfer.effectAllowed = "copyMove";
  }

  if (viewMode === "list") {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={() => onClick(item)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group"
        style={{ background: "transparent" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-hover)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        {isImage && item.previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.previewUrl}
            alt={item.name}
            className="w-8 h-8 rounded object-cover flex-shrink-0"
          />
        ) : (
          <FileIcon mimeType={item.mimeType} />
        )}
        <span
          className="flex-1 text-sm truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {item.size ? formatSize(item.size) : "—"}
        </span>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <FileContextMenu
              itemId={item._id}
              onRename={() => {
                setShowMenu(false);
                onRename(item._id, item.name);
              }}
              onDelete={() => {
                setShowMenu(false);
                onDelete(item._id, item.name);
              }}
              onClose={() => setShowMenu(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onClick(item)}
      className="flex flex-col rounded-xl border cursor-pointer transition-all group relative overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-hover)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border)")
      }
    >
      {/* Thumbnail area */}
      <div
        className="flex items-center justify-center h-24 overflow-hidden"
        style={{ background: "var(--bg-page)" }}
      >
        {isImage && item.previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.previewUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileIcon mimeType={item.mimeType} />
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p
          className="text-xs truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </p>
        <p
          className="text-[10px] mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          {item.size ? formatSize(item.size) : "—"}
        </p>
      </div>

      {/* Menu button */}
      <div className="absolute top-1 right-1">
        <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            color: "var(--text-muted)",
            background: "rgba(0,0,0,0.5)",
          }}
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
        {showMenu && (
          <FileContextMenu
            itemId={item._id}
            onRename={() => {
              setShowMenu(false);
              onRename(item._id, item.name);
            }}
            onDelete={() => {
              setShowMenu(false);
              onDelete(item._id, item.name);
            }}
            onClose={() => setShowMenu(false)}
          />
        )}
        </div>
      </div>
    </div>
  );
}

function FileContextMenu({
  itemId,
  onRename,
  onDelete,
  onClose,
}: {
  itemId: string;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg py-1 min-w-[140px]"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <a
          href={`/api/media/drive/${itemId}/download`}
          onClick={(e) => e.stopPropagation()}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80"
          style={{ color: "var(--text-primary)" }}
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
        <button
          onClick={onRename}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80"
          style={{ color: "var(--text-primary)" }}
        >
          <Pencil className="w-3.5 h-3.5" />
          Rename
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80"
          style={{ color: "var(--error)" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/media/drive/DriveFolderCard.tsx components/media/drive/DriveFileCard.tsx
git commit -m "feat(drive): add DriveFolderCard and DriveFileCard components"
```

---

### Task 12: DriveDropZone and DriveFileGrid

**Files:**
- Create: `components/media/drive/DriveDropZone.tsx`
- Create: `components/media/drive/DriveFileGrid.tsx`

- [ ] **Step 1: Create `components/media/drive/DriveDropZone.tsx`**

```typescript
"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";

interface DriveDropZoneProps {
  children: React.ReactNode;
  onDropFiles: (files: FileList) => void;
}

export default function DriveDropZone({
  children,
  onDropFiles,
}: DriveDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    // Only show the upload overlay for file drops from OS, not internal moves
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  }

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Upload overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl border-2 border-dashed"
          style={{
            background: "rgba(10, 15, 20, 0.85)",
            borderColor: "var(--accent)",
            boxShadow: "inset 0 0 30px rgba(212, 160, 23, 0.1)",
          }}
        >
          <Upload
            className="w-10 h-10 mb-2"
            style={{ color: "var(--accent)" }}
          />
          <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
            Drop files to upload
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Files will be added to the current folder
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `components/media/drive/DriveFileGrid.tsx`**

```typescript
"use client";

import { Upload } from "lucide-react";
import type { MediaFile } from "@/lib/types";
import DriveFolderCard from "./DriveFolderCard";
import DriveFileCard from "./DriveFileCard";

interface DriveFileGridProps {
  items: MediaFile[];
  viewMode: "grid" | "list";
  loading: boolean;
  onNavigateFolder: (folderId: string) => void;
  onFileClick: (item: MediaFile) => void;
  onMoveToFolder: (itemId: string, targetFolderId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string, name: string) => void;
  onUploadClick: () => void;
  onCreateFolder: () => void;
}

export default function DriveFileGrid({
  items,
  viewMode,
  loading,
  onNavigateFolder,
  onFileClick,
  onMoveToFolder,
  onRename,
  onDelete,
  onUploadClick,
  onCreateFolder,
}: DriveFileGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{
            borderColor: "var(--border)",
            borderTopColor: "var(--accent)",
          }}
        />
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Upload
          className="w-10 h-10 mb-3"
          style={{ color: "var(--accent)" }}
        />
        <p
          className="text-sm font-medium mb-1"
          style={{ color: "var(--text-muted)" }}
        >
          Drop files here or click to upload
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onUploadClick}
            className="px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
            }}
          >
            Upload Files
          </button>
          <button
            onClick={onCreateFolder}
            className="px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
            }}
          >
            Create Folder
          </button>
        </div>
      </div>
    );
  }

  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type === "file");

  if (viewMode === "list") {
    return (
      <div className="space-y-0.5">
        {folders.map((item) => (
          <DriveFolderCard
            key={item._id}
            item={item}
            viewMode="list"
            onNavigate={onNavigateFolder}
            onDrop={onMoveToFolder}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
        {files.map((item) => (
          <DriveFileCard
            key={item._id}
            item={item}
            viewMode="list"
            onClick={onFileClick}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
      {folders.map((item) => (
        <DriveFolderCard
          key={item._id}
          item={item}
          viewMode="grid"
          onNavigate={onNavigateFolder}
          onDrop={onMoveToFolder}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
      {files.map((item) => (
        <DriveFileCard
          key={item._id}
          item={item}
          viewMode="grid"
          onClick={onFileClick}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/media/drive/DriveDropZone.tsx components/media/drive/DriveFileGrid.tsx
git commit -m "feat(drive): add DriveDropZone and DriveFileGrid components"
```

---

### Task 13: DrivePreviewModal

**Files:**
- Create: `components/media/drive/DrivePreviewModal.tsx`

Full-screen overlay with image zoom, video player, file info, download, and arrow navigation.

- [ ] **Step 1: Create `components/media/drive/DrivePreviewModal.tsx`**

```typescript
"use client";

import { useEffect, useCallback, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import type { MediaFile } from "@/lib/types";

interface DrivePreviewModalProps {
  item: MediaFile;
  previewUrl: string | null;
  allFiles: MediaFile[];
  onClose: () => void;
  onNavigate: (item: MediaFile) => void;
}

export default function DrivePreviewModal({
  item,
  previewUrl,
  allFiles,
  onClose,
  onNavigate,
}: DrivePreviewModalProps) {
  const [zoomed, setZoomed] = useState(false);
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const isImage = item.mimeType?.startsWith("image/");
  const isVideo = item.mimeType?.startsWith("video/");

  // Fetch preview URL for items that don't have one (videos, non-images)
  useEffect(() => {
    setFetchedUrl(null);
    if (previewUrl || (!isImage && !isVideo)) return;
    fetch(`/api/media/drive/${item._id}/preview`)
      .then((r) => r.json())
      .then((d) => { if (d.data?.previewUrl) setFetchedUrl(d.data.previewUrl); })
      .catch(() => {});
  }, [item._id, previewUrl, isImage, isVideo]);

  const resolvedUrl = previewUrl || fetchedUrl;

  const currentIndex = allFiles.findIndex((f) => f._id === item._id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allFiles.length - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev)
        onNavigate(allFiles[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext)
        onNavigate(allFiles[currentIndex + 1]);
    },
    [onClose, onNavigate, allFiles, currentIndex, hasPrev, hasNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function formatSize(bytes?: number): string {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.9)" }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {item.name}
          </span>
          <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {formatSize(item.size)}
            {item.uploadedBy && ` · ${item.uploadedBy}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isImage && (
            <button
              onClick={() => setZoomed(!zoomed)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              {zoomed ? (
                <ZoomOut className="w-5 h-5" />
              ) : (
                <ZoomIn className="w-5 h-5" />
              )}
            </button>
          )}
          <a
            href={`/api/media/drive/${item._id}/download`}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            title="Download"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full z-10"
          style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(allFiles[currentIndex - 1]);
          }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {hasNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full z-10"
          style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(allFiles[currentIndex + 1]);
          }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Content */}
      <div
        className="max-w-[90vw] max-h-[80vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && resolvedUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={resolvedUrl}
            alt={item.name}
            className="rounded-lg transition-transform"
            style={{
              maxWidth: zoomed ? "none" : "90vw",
              maxHeight: zoomed ? "none" : "80vh",
              objectFit: "contain",
              cursor: zoomed ? "zoom-out" : "zoom-in",
            }}
            onClick={() => setZoomed(!zoomed)}
          />
        ) : isVideo && resolvedUrl ? (
          <video
            src={resolvedUrl}
            controls
            autoPlay
            className="rounded-lg"
            style={{ maxWidth: "90vw", maxHeight: "80vh" }}
          />
        ) : (
          <div
            className="flex flex-col items-center gap-3 p-8 rounded-xl"
            style={{ background: "var(--bg-card)" }}
          >
            <p
              className="text-lg font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {item.name}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {item.mimeType || "Unknown type"} · {formatSize(item.size)}
            </p>
            <a
              href={`/api/media/drive/${item._id}/download`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm mt-2"
              style={{
                background: "var(--accent)",
                color: "var(--accent-text)",
              }}
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/media/drive/DrivePreviewModal.tsx
git commit -m "feat(drive): add DrivePreviewModal with image zoom, video player, navigation"
```

---

### Task 14: AssetDrive main container

**Files:**
- Create: `components/media/drive/AssetDrive.tsx`

The orchestrator component. Manages state for current folder, view mode, upload queue, rename/delete dialogs. Composes all sub-components.

- [ ] **Step 1: Create `components/media/drive/AssetDrive.tsx`**

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import useSWR from "swr";
import type { MediaFile } from "@/lib/types";
import AssetWarningBar from "./AssetWarningBar";
import DriveToolbar from "./DriveToolbar";
import DriveDropZone from "./DriveDropZone";
import DriveFileGrid from "./DriveFileGrid";
import DrivePreviewModal from "./DrivePreviewModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AssetDrive() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewItem, setPreviewItem] = useState<MediaFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryParam = currentFolderId ? `?parentId=${currentFolderId}` : "";
  const { data, isLoading, mutate } = useSWR(
    `/api/media/drive${queryParam}`,
    fetcher
  );

  const items: MediaFile[] = data?.data || [];
  const breadcrumbs: { _id: string; name: string }[] = data?.breadcrumbs || [];
  const files = items.filter((i) => i.type === "file");

  // Navigation — breadcrumbs auto-update via SWR when currentFolderId changes
  const handleNavigate = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
  }, []);

  // Upload files (handles both small and large)
  const handleUploadFiles = useCallback(
    async (fileList: FileList) => {
      setUploading(true);
      try {
        for (const file of Array.from(fileList)) {
          if (file.size < 4 * 1024 * 1024) {
            // Small file: direct upload
            const formData = new FormData();
            formData.append("file", file);
            if (currentFolderId) formData.append("parentId", currentFolderId);
            await fetch("/api/media/drive/upload", {
              method: "POST",
              body: formData,
            });
          } else {
            // Large file: presigned URL flow
            const urlRes = await fetch("/api/media/drive/upload-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: file.name,
                mimeType: file.type || "application/octet-stream",
                size: file.size,
              }),
            });
            const { data: urlData } = await urlRes.json();
            if (!urlData?.uploadUrl) continue;

            // Upload directly to R2
            await fetch(urlData.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": file.type || "application/octet-stream" },
              body: file,
            });

            // Confirm upload
            await fetch("/api/media/drive/upload-confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                r2Key: urlData.r2Key,
                name: file.name,
                parentId: currentFolderId,
                size: file.size,
                mimeType: file.type || "application/octet-stream",
              }),
            });
          }
        }
      } finally {
        setUploading(false);
        mutate();
      }
    },
    [currentFolderId, mutate]
  );

  // Create folder
  const handleCreateFolder = useCallback(async () => {
    const name = prompt("Folder name:");
    if (!name?.trim()) return;
    await fetch("/api/media/drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parentId: currentFolderId }),
    });
    mutate();
  }, [currentFolderId, mutate]);

  // Move item to folder
  const handleMoveToFolder = useCallback(
    async (itemId: string, targetFolderId: string | null) => {
      await fetch(`/api/media/drive/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: targetFolderId }),
      });
      mutate();
    },
    [mutate]
  );

  // Rename
  const handleRename = useCallback(
    async (id: string, currentName: string) => {
      const newName = prompt("New name:", currentName);
      if (!newName?.trim() || newName.trim() === currentName) return;
      await fetch(`/api/media/drive/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      mutate();
    },
    [mutate]
  );

  // Delete
  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
      await fetch(`/api/media/drive/${id}`, { method: "DELETE" });
      mutate();
    },
    [mutate]
  );

  // Preview
  const handleFileClick = useCallback((item: MediaFile) => {
    setPreviewItem(item);
  }, []);

  const handlePreviewNavigate = useCallback((item: MediaFile) => {
    setPreviewItem(item);
  }, []);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Asset warnings */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <AssetWarningBar />
      </div>

      {/* Drive content */}
      <div className="p-4">
        <DriveToolbar
          breadcrumbs={breadcrumbs}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigate={handleNavigate}
          onCreateFolder={handleCreateFolder}
          onUploadFiles={handleUploadFiles}
          onMoveToFolder={handleMoveToFolder}
        />

        {uploading && (
          <div
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
            }}
          >
            <div
              className="w-3 h-3 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--accent)",
              }}
            />
            Uploading...
          </div>
        )}

        <DriveDropZone onDropFiles={handleUploadFiles}>
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 360 }}
          >
            <DriveFileGrid
              items={items}
              viewMode={viewMode}
              loading={isLoading}
              onNavigateFolder={(id) => handleNavigate(id)}
              onFileClick={handleFileClick}
              onMoveToFolder={handleMoveToFolder}
              onRename={handleRename}
              onDelete={handleDelete}
              onUploadClick={() => fileInputRef.current?.click()}
              onCreateFolder={handleCreateFolder}
            />
          </div>
        </DriveDropZone>
      </div>

      {/* Hidden file input for empty state upload button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleUploadFiles(e.target.files);
          if (e.target) e.target.value = "";
        }}
      />

      {/* Preview modal */}
      {previewItem && (
        <DrivePreviewModal
          item={previewItem}
          previewUrl={previewItem.previewUrl || null}
          allFiles={files}
          onClose={() => setPreviewItem(null)}
          onNavigate={handlePreviewNavigate}
        />
      )}
    </div>
  );
}
```

*Note: Breadcrumbs are returned by the GET `/api/media/drive` response (`data.breadcrumbs`), so no separate client-side helper is needed.*

- [ ] **Step 3: Commit**

```bash
git add components/media/drive/AssetDrive.tsx
git commit -m "feat(drive): add AssetDrive main container component"
```

---

## Chunk 3: Integration (wire into media page, drag-to-template, cleanup)

### Task 15: Replace AssetStatus with AssetDrive in media page

**Files:**
- Modify: `app/(dashboard)/media/page.tsx`

- [ ] **Step 1: Update imports in `app/(dashboard)/media/page.tsx`**

Replace the AssetStatus import:

```typescript
// Old:
import AssetStatus from "@/components/media/AssetStatus";
// New:
import AssetDrive from "@/components/media/drive/AssetDrive";
```

- [ ] **Step 2: Replace the AssetStatus usage in the JSX**

Find the section:
```tsx
{/* Asset status */}
<div className="mb-6">
  <AssetStatus />
</div>
```

Replace with:
```tsx
{/* Asset Drive */}
<div className="mb-6">
  <AssetDrive />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/media/page.tsx
git commit -m "feat(drive): replace AssetStatus with AssetDrive in media page"
```

---

### Task 16: Add drag-to-template support in CardImage

**Files:**
- Modify: `components/media/shared/CardImage.tsx`

Add `onDragOver` and `onDrop` handlers to the CardImage component's container div. When a `application/x-drive-asset` drop is received, call `onOverride` with the asset's preview URL.

- [ ] **Step 1: Add drop handler to CardImage**

Add a drop zone wrapper around the entire component. In `CardImage`, add these handlers inside the component function before the return:

```typescript
function handleDragOver(e: React.DragEvent) {
  if (e.dataTransfer.types.includes("application/x-drive-asset")) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
}

function handleDrop(e: React.DragEvent) {
  const assetJson = e.dataTransfer.getData("application/x-drive-asset");
  if (assetJson) {
    e.preventDefault();
    try {
      const asset = JSON.parse(assetJson);
      if (asset.previewUrl) {
        onOverride(asset.previewUrl);
      }
    } catch {
      // Ignore malformed data
    }
  }
}
```

Then wrap the component's outer `<div className="space-y-2">` with the handlers:

```tsx
<div
  className="space-y-2"
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
```

- [ ] **Step 2: Commit**

```bash
git add components/media/shared/CardImage.tsx
git commit -m "feat(drive): add drag-from-drive support to CardImage"
```

---

### Task 17: Verify build and test manually

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds without R2 env vars.

- [ ] **Step 2: Test locally with dev server**

```bash
npm run dev
```

Verify on `http://localhost:3001`:
1. Media page loads with AssetDrive panel instead of AssetStatus
2. Warning bar shows (all assets will be "missing" since drive is empty)
3. Empty state shows in the file grid
4. Create folder works
5. Upload file works (need R2 env vars set in `.env.local`)
6. Grid/list toggle works
7. Folder navigation + breadcrumbs work
8. File preview modal opens on click
9. Drag file onto folder to move works
10. Drag file from drive onto CardImage in template editor works

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(drive): polish and fixes from manual testing"
```
