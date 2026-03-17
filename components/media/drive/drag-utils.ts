/**
 * Brand drag-and-drop visual utilities.
 *
 * Two-element pattern (pointer-event style over HTML5 DnD):
 * 1. Original card renders in "placeholder" mode (isDragging prop)
 * 2. A React-rendered ghost follows the cursor via dragover events
 */

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
    transform: "rotate(2deg) scale(1.03)",
    transition: "transform 0.05s",
  };
}

/** Ghost inner card styles — the glassmorphism accent card */
export const GHOST_CARD_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06))",
  border: "1.5px solid rgba(251, 191, 36, 0.53)",
  borderRadius: 12,
  backdropFilter: "blur(16px)",
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(251, 191, 36, 0.27)",
  padding: "10px 12px",
  overflow: "hidden",
};
