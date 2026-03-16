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

/** Hide broken images gracefully in both preview and export */
export function onAssetError(e: React.SyntheticEvent<HTMLImageElement>) {
  (e.target as HTMLImageElement).style.display = "none";
}
