/**
 * Renders one or two commander card images.
 * Single card: centered, no rotation.
 * Partner pair: two cards fanned at ±8° with slight overlap, like a hand of cards.
 */

interface DualCommanderCardsProps {
  mainUrl: string | null;
  partnerUrl: string | null;
  mainName?: string;
  partnerName?: string;
  /** Total height for the card area. Cards scale to fit. */
  cardHeight: number;
  /** Border color for card frames. Default: transparent */
  borderColor?: string;
  /** Glow color behind cards. Default: none */
  glowColor?: string;
}

export default function DualCommanderCards({
  mainUrl,
  partnerUrl,
  mainName,
  partnerName,
  cardHeight,
  borderColor = "transparent",
  glowColor,
}: DualCommanderCardsProps) {
  const hasPartner = !!partnerUrl;
  const singleHeight = cardHeight;
  const dualHeight = Math.round(cardHeight * 0.85);

  if (!mainUrl && !partnerUrl) return null;

  // Single card
  if (!hasPartner) {
    return (
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        {glowColor && (
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: 20,
              background: `radial-gradient(ellipse, ${glowColor}, transparent 70%)`,
              filter: "blur(20px)",
            }}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainUrl!}
          alt={mainName || "Commander"}
          style={{
            position: "relative",
            height: singleHeight,
            width: "auto",
            borderRadius: 16,
            border: borderColor !== "transparent" ? `2px solid ${borderColor}` : "none",
            boxShadow: glowColor
              ? `0 16px 64px rgba(0,0,0,0.7), 0 0 40px ${glowColor}`
              : "0 16px 48px rgba(0,0,0,0.6)",
          }}
        />
      </div>
    );
  }

  // Partner pair — fanned cards
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: dualHeight + 40,
        width: "100%",
      }}
    >
      {glowColor && (
        <div
          style={{
            position: "absolute",
            inset: -30,
            borderRadius: 20,
            background: `radial-gradient(ellipse, ${glowColor}, transparent 65%)`,
            filter: "blur(24px)",
          }}
        />
      )}

      {/* Left card (main) — tilted left */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mainUrl!}
        alt={mainName || "Commander"}
        style={{
          position: "absolute",
          height: dualHeight,
          width: "auto",
          borderRadius: 14,
          border: borderColor !== "transparent" ? `2px solid ${borderColor}` : "none",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          transform: "rotate(-8deg) translateX(-25%)",
          zIndex: 1,
        }}
      />

      {/* Right card (partner) — tilted right */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={partnerUrl!}
        alt={partnerName || "Partner"}
        style={{
          position: "absolute",
          height: dualHeight,
          width: "auto",
          borderRadius: 14,
          border: borderColor !== "transparent" ? `2px solid ${borderColor}` : "none",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          transform: "rotate(8deg) translateX(25%)",
          zIndex: 2,
        }}
      />
    </div>
  );
}
