/**
 * Brand drag-and-drop visual utilities.
 *
 * Two-element pattern (pointer-event style over HTML5 DnD):
 * 1. Original card renders in "placeholder" mode (isDragging prop)
 * 2. A React-rendered ghost follows the cursor via dragover events
 */

/* ── Thumbnail cache for drag ghosts (capped at 50 entries to limit memory) ── */
const THUMB_CACHE_MAX = 50;
const thumbnailCache = new Map<string, string>();

export function cacheThumbnail(id: string, img: HTMLImageElement, size = 80) {
  if (thumbnailCache.has(id)) return;
  // Evict oldest entry if at capacity
  if (thumbnailCache.size >= THUMB_CACHE_MAX) {
    const oldest = thumbnailCache.keys().next().value;
    if (oldest !== undefined) thumbnailCache.delete(oldest);
  }
  try {
    const canvas = document.createElement("canvas");
    const aspect = img.naturalWidth / img.naturalHeight;
    canvas.width = aspect >= 1 ? size : Math.round(size * aspect);
    canvas.height = aspect >= 1 ? Math.round(size / aspect) : size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    thumbnailCache.set(id, canvas.toDataURL("image/jpeg", 0.6));
  } catch { /* cross-origin or other error — skip */ }
}

export function getCachedThumbnail(id: string): string | null {
  return thumbnailCache.get(id) ?? null;
}

/* ── Shared drag ID tracking (module-level, read by all card components) ── */
let _currentDragId: string | null = null;
export function setCurrentDragId(id: string | null) { _currentDragId = id; }
export function getCurrentDragId() { return _currentDragId; }

/** Placeholder styles applied when isDragging is true */
export const DRAG_PLACEHOLDER_STYLE: React.CSSProperties = {
  opacity: 0.4,
  border: "1.5px dashed rgba(255, 255, 255, 0.15)",
  background: "transparent",
  backdropFilter: "none",
  boxShadow: "none",
  transform: "none",
};

/** Ghost wrapper styles — the outer fixed-position container */
export function ghostWrapperStyle(x: number, y: number, width: number, height?: number): React.CSSProperties {
  return {
    position: "fixed",
    left: x,
    top: y,
    width,
    height,
    pointerEvents: "none",
    zIndex: 9999,
    transform: "rotate(2deg) scale(0.55)",
    transition: "transform 0.05s",
  };
}

/** Ghost inner card styles — solid dark card (no backdropFilter to avoid GPU thrash at 60fps) */
export const GHOST_CARD_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(22, 24, 30, 0.95), rgba(16, 18, 22, 0.98))",
  border: "1.5px solid rgba(251, 191, 36, 0.53)",
  borderRadius: 12,
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(251, 191, 36, 0.27)",
  padding: "10px 12px",
  overflow: "hidden",
};
