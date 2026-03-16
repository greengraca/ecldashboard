# Asset Drive — Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Replaces:** AssetStatus panel in media tab

## Overview

A Google Drive-like file manager embedded in the media tab, replacing the current AssetStatus collapsible panel. The team can upload, organize, preview, and download assets (images, videos, documents) with full folder hierarchy, drag-and-drop interactions, and direct integration with template editor fields.

## Architecture

- **Cloudflare R2** — blob storage (S3-compatible, 10GB free tier, zero egress fees)
- **MongoDB** (`dashboard_media_files`) — metadata + folder hierarchy
- **Vercel API routes** — CRUD, upload streaming, presigned URL generation

## Data Model

### Collection: `dashboard_media_files`

```typescript
{
  _id: ObjectId,
  name: string,              // "ecl-logo.png"
  type: "file" | "folder",
  mimeType?: string,         // "image/png", "video/mp4" — files only
  size?: number,             // bytes — files only
  r2Key?: string,            // R2 object key — files only
  parentId: ObjectId | null, // null = root level
  path: string,              // "/logos/ecl-logo.png" — materialized path
  uploadedBy: string,        // Discord username
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

| Index | Purpose |
|-------|---------|
| `{ parentId: 1, name: 1 }` (unique) | Folder listing, prevent duplicate names |
| `{ path: 1 }` | Breadcrumb resolution |
| `{ r2Key: 1 }` | R2 cleanup lookups |

### Why materialized path?

Breadcrumbs and move operations need the full path without recursive parent lookups. On move/rename, batch-update the item's path and all descendants using regex prefix replacement.

**Concurrency note:** With a ~5-person team, concurrent move/rename conflicts on the same subtree are extremely unlikely. Accepted risk — no transactions needed for v1.

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/media/drive` | GET | List folder contents (`?parentId=` or root). Folders first, then alphabetical. Returns `previewUrl` (presigned, 1hr TTL) for image files in the response to avoid per-file preview requests |
| `/api/media/drive` | POST | Create folder (`{ name, parentId }`) |
| `/api/media/drive/upload` | POST | Small files (<4MB) — multipart form (file + parentId), streams to R2, creates metadata |
| `/api/media/drive/upload-url` | POST | Large files — returns presigned PUT URL + r2Key for direct-to-R2 upload |
| `/api/media/drive/upload-confirm` | POST | Confirms direct upload succeeded, creates metadata document (`{ r2Key, name, parentId, size, mimeType }`) |
| `/api/media/drive/[id]` | GET | Single item metadata |
| `/api/media/drive/[id]` | PATCH | Rename (`{ name }`) or move (`{ parentId }`) — updates path for item + descendants |
| `/api/media/drive/[id]` | DELETE | Delete file or folder (recursive). Deletes R2 objects first, then DB docs — partial R2 failure leaves recoverable metadata, not orphaned blobs |
| `/api/media/drive/[id]/download` | GET | Presigned R2 URL redirect for full-quality download |
| `/api/media/drive/[id]/preview` | GET | Presigned URL for inline preview (1hr TTL, cached client-side) |
| `/api/media/drive/asset-status` | GET | Check which REQUIRED_ASSETS paths exist in the drive |

### Upload flow (dual-path)

**Small files (<4MB) — server-side proxy:**
1. Client sends multipart POST with file + parentId to `/upload`
2. API generates R2 key: `media/{uuid}-{filename}` (flat key, no parentId)
3. Streams file body to R2 via `PutObjectCommand`
4. Creates metadata document in MongoDB
5. Returns metadata with preview URL

**Large files (>=4MB) — direct-to-R2:**
1. Client POSTs `{ name, parentId, size, mimeType }` to `/upload-url`
2. API generates R2 key, returns presigned PUT URL (15min TTL) + r2Key
3. Client uploads directly to R2 using the presigned URL (bypasses Vercel 4.5MB body limit)
4. Client POSTs `{ r2Key, name, parentId, size, mimeType }` to `/upload-confirm`
5. API verifies the R2 object exists via `HeadObjectCommand`, creates metadata document

**R2 key format:** `media/{uuid}-{filename}` — flat namespace, no folder embedding. Keys are immutable and don't change on file move (only MongoDB path/parentId update).

### Size limit

100MB per file via presigned URL upload. Small file proxy path limited to 4MB by Vercel serverless body limit.

### Name collision handling

If a file/folder with the same name exists in the target folder, auto-rename by appending a counter suffix: `ecl-logo (1).png`, `ecl-logo (2).png`, etc. Matches Google Drive behavior.

### Auth

All mutation routes check `auth()` and return 401 if unauthenticated.

## R2 Integration

### Environment variables

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=ecl-media
R2_PUBLIC_URL=          # optional, if bucket is public
```

### Lib: `lib/r2.ts`

- Lazy singleton `S3Client` using globalThis cache (same pattern as `lib/mongodb.ts`)
- Uses `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- Helpers: `uploadToR2(key, body, contentType)`, `deleteFromR2(key)`, `getPresignedUrl(key, expiresIn)`, `deleteManyFromR2(keys[])` for recursive folder delete

### Build safety

Lazy init — build succeeds without R2 env vars.

## UI Components

### Component tree

```
AssetDrive (replaces AssetStatus)
├── AssetWarningBar          — yellow banner if required assets missing, collapsible detail
├── DriveToolbar             — breadcrumbs, view toggle (grid/list), "New Folder" btn, upload btn
├── DriveDropZone            — wraps file grid, handles drag-from-desktop upload
│   └── DriveFileGrid        — file/folder display (grid or list mode)
│       ├── DriveFolderCard  — folder icon, name, click to navigate into
│       └── DriveFileCard    — thumbnail/icon, name, size badge, draggable
└── DrivePreviewModal        — full preview (image/video), file info, download button
```

### Empty state

When no files/folders exist (first use): centered illustration area with upload icon, "Drop files here or click to upload" text, and a "Create Folder" button. Uses `--text-muted` for the prompt text, `--accent` for the upload icon.

### Layout

- Replaces AssetStatus collapsible panel, **defaults to expanded**
- Max height ~400px with internal scroll, expandable to full height
- Grid view: 4-5 columns of thumbnail cards
- List view: compact rows (icon, name, size, date)
- Toggle between views via toolbar icon

### Visual style

All dashboard CSS variables — consistent with glassmorphism dark theme:

- Cards: `--bg-card` background, `--border` border, `--bg-card-hover` on hover
- Folder cards: folder icon tinted with `--accent`
- File thumbnails: rounded corners, subtle hover scale
- Upload dropzone: dashed `--border`, glows `--accent` on drag-over
- Breadcrumbs: clickable segments in `--text-secondary`, current in `--text-primary`
- Warning bar: `--warning` / `--warning-light` styling (matching current AssetStatus)

## Drag-and-Drop

Three interaction modes:

### 1. Upload from desktop

Drag files from OS file manager onto `DriveDropZone`. Visual feedback: dashed border highlights, accent glow overlay with "Drop to upload" text. Files upload to the currently viewed folder.

### 2. Move within drive

Drag a `DriveFileCard` or `DriveFolderCard` onto:
- A folder card → moves item into that folder
- A breadcrumb segment → moves item to that ancestor folder

Visual feedback: target folder highlights with accent border. Uses HTML5 drag-and-drop API with `dataTransfer` type identification.

### 3. Drag into template editor

`DriveFileCard` sets `dataTransfer` with a `application/x-drive-asset` type containing `{ id, previewUrl, name }`. Template editor image fields (`CardImage`, `ImagePreview`) accept this drop type — populates the field with the drive asset's preview URL, replacing the Scryfall/manual upload flow.

**Note:** HTML5 drag-and-drop only works within the same browser tab. Since the drive and template editor are on the same page, this is not a limitation in practice.

## Preview Modal

- **Images:** Full resolution render, click to zoom
- **Videos:** Native `<video>` player with controls
- **Other files:** Large file type icon + metadata (name, size, type, uploaded by, date)
- **Download button:** Always visible, hits `/download` route for full-quality presigned URL
- **Navigation:** Arrow keys / buttons to move between files in current folder

## Asset Status Warnings

The existing `REQUIRED_ASSETS` from `brand-constants.ts` are checked against drive contents:
- `/api/media/drive/asset-status` queries for files matching required asset names
- Missing assets show as yellow warning badges in `AssetWarningBar`
- Warning bar collapses to a single line when all assets present (green check)
- When assets are missing, bar expands to show which ones with path hints

## Dependencies

### New npm packages

- `@aws-sdk/client-s3` — R2/S3 operations
- `@aws-sdk/s3-request-presigner` — presigned URL generation

### Existing packages used

- `swr` — client-side data fetching for folder contents
- `lucide-react` — file/folder icons
- `mongodb` — metadata collection operations

## File inventory

### New files

- `lib/r2.ts` — R2 client singleton + helpers
- `lib/media-drive.ts` — MongoDB CRUD for `dashboard_media_files`
- `app/api/media/drive/route.ts` — list + create folder
- `app/api/media/drive/upload/route.ts` — small file upload (multipart, <4MB)
- `app/api/media/drive/upload-url/route.ts` — presigned URL for direct-to-R2 upload
- `app/api/media/drive/upload-confirm/route.ts` — confirm direct upload, create metadata
- `app/api/media/drive/[id]/route.ts` — get, rename, move, delete
- `app/api/media/drive/[id]/download/route.ts` — presigned download redirect
- `app/api/media/drive/[id]/preview/route.ts` — presigned preview URL
- `app/api/media/drive/asset-status/route.ts` — required asset check
- `components/media/drive/AssetDrive.tsx` — main container
- `components/media/drive/AssetWarningBar.tsx` — missing asset warnings
- `components/media/drive/DriveToolbar.tsx` — breadcrumbs, view toggle, actions
- `components/media/drive/DriveDropZone.tsx` — drag-to-upload wrapper
- `components/media/drive/DriveFileGrid.tsx` — grid/list file display
- `components/media/drive/DriveFolderCard.tsx` — folder card
- `components/media/drive/DriveFileCard.tsx` — file card with thumbnail
- `components/media/drive/DrivePreviewModal.tsx` — preview overlay

### Modified files

- `app/(dashboard)/media/page.tsx` — replace AssetStatus with AssetDrive
- `components/media/shared/CardImage.tsx` — accept drive asset drops
- `components/media/TemplateEditor.tsx` — accept drive asset drops on image fields
- `components/media/shared/brand-constants.ts` — update REQUIRED_ASSETS to check drive
- `lib/types.ts` — add MediaFile interface:

```typescript
export interface MediaFile {
  _id: string;
  name: string;
  type: "file" | "folder";
  mimeType?: string;
  size?: number;
  r2Key?: string;
  parentId: string | null;
  path: string;
  previewUrl?: string;  // presigned URL, included in list responses for images
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}
```
