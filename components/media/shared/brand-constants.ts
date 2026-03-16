// Brand constants for media templates — hardcoded, NOT CSS variables.
// Templates render standalone branded images, exempt from dashboard theming.

export const BRAND = {
  gold: "#D4A017",
  goldLight: "#E8C547",
  goldDark: "#A07B0A",
  goldGlow: "rgba(212, 160, 23, 0.4)",
  textWhite: "#FFFFFF",
  textGray: "#CCCCCC",
  textMuted: "#999999",
  bgDark: "#0a0a14",
  bgCard: "rgba(0, 0, 0, 0.5)",
  bgCardBorder: "rgba(212, 160, 23, 0.2)",
  separator: "rgba(212, 160, 23, 0.4)",
  overlay: "rgba(0, 0, 0, 0.6)",
} as const;

export const FONTS = {
  cinzel: "'Cinzel', serif",
} as const;

export const DIMENSIONS = {
  story: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1080 },
} as const;

// Asset paths — all brand assets expected in public/media/assets/
export const ASSETS = {
  eclLogo: "/media/assets/ecl-logo.png",
  eclLogoOnly: "/media/assets/ecl-logo-only.png",
  commanderArenaLogo: "/media/assets/commander-arena-logo.png",
  cedhPtLogo: "/media/assets/cedh-championship-logo.png",
  backgroundSmoke: "/media/assets/background-smoke.jpg",
  championRing: "/media/assets/champion-ring.png",
  championshipTicket: "/media/assets/championship-ticket.png",
} as const;

// All required assets for checklist
export const REQUIRED_ASSETS = Object.entries(ASSETS).map(([key, path]) => ({
  key,
  path,
  label: key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim(),
}));

// Noise texture SVGs as base64 — avoids html-to-image parsing url(#id) inside data URIs
export const NOISE_BG = `url("data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjU2IDI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIxIi8+PC9zdmc+")`;
export const NOISE_BG_FINE = `url("data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjU2IDI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==")`;

/** Hide broken images gracefully in both preview and export */
export function onAssetError(e: React.SyntheticEvent<HTMLImageElement>) {
  (e.target as HTMLImageElement).style.display = "none";
}
