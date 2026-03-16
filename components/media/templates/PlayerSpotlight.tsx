import { DIMENSIONS, ASSETS, NOISE_BG_FINE, onAssetError } from "../shared/brand-constants";

/**
 * PLAYER SPOTLIGHT — Monochromatic color-blocked feed post.
 * Bold split layout, oversized player name, minimal stats.
 * Deep teal monochrome pushed to extremes — 2026 single-hue trend.
 */

interface PlayerSpotlightData {
  month: string;
  playerName: string;
  commanderName?: string;
  commanderName_imageUrl?: string;
  commanderName_overrideUrl?: string;
  hasPartner?: boolean;
  partnerName?: string;
  partnerName_imageUrl?: string;
  partnerName_overrideUrl?: string;
  stat1Label?: string;
  stat1Value?: string;
  stat2Label?: string;
  stat2Value?: string;
  stat3Label?: string;
  stat3Value?: string;
  label?: string; // "CHAMPION", "MVP", "MOST GAMES", etc.
}

const FONT = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";

export default function PlayerSpotlight({ data }: { data: PlayerSpotlightData }) {
  const { width, height } = DIMENSIONS.feed;
  const commanderImageUrl =
    data.commanderName_overrideUrl || data.commanderName_imageUrl || null;
  const partnerImageUrl = data.hasPartner
    ? data.partnerName_overrideUrl || data.partnerName_imageUrl || null
    : null;
  const hasPartner = !!partnerImageUrl;
  const label = data.label || "PLAYER SPOTLIGHT";

  const stats = [
    data.stat1Label && data.stat1Value ? { label: data.stat1Label, value: data.stat1Value } : null,
    data.stat2Label && data.stat2Value ? { label: data.stat2Label, value: data.stat2Value } : null,
    data.stat3Label && data.stat3Value ? { label: data.stat3Label, value: data.stat3Value } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div
      style={{
        width,
        height,
        background: "#021a1a",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      {/* Monochrome gradient wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(160deg, #021a1a 0%, #043737 40%, #065656 60%, #043737 80%, #021a1a 100%)",
        }}
      />

      {/* Noise texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage: NOISE_BG_FINE,
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
        }}
      />

      {/* Accent color block — top-right corner */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 400,
          height: 400,
          background: "linear-gradient(225deg, rgba(20, 184, 166, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Horizontal accent line */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, rgba(20, 184, 166, 0.4), rgba(20, 184, 166, 0.05))",
        }}
      />

      {/* Top bar — logo + label badge */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "48px 56px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 44, width: "auto", opacity: 0.8 }}
        />
        <div
          style={{
            background: "rgba(20, 184, 166, 0.15)",
            border: "1px solid rgba(20, 184, 166, 0.3)",
            borderRadius: 4,
            padding: "6px 20px",
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#5eead4",
              letterSpacing: "0.15em",
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Main content — split layout */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          padding: "0 56px",
          gap: 40,
        }}
      >
        {/* Left — name and stats */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Player name — oversized, broken across lines */}
          <h1
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "#fff",
              margin: 0,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              wordBreak: "break-word",
            }}
          >
            {data.playerName || "PLAYER"}
          </h1>

          {/* Commander name */}
          {data.commanderName && (
            <p
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: "#5eead4",
                margin: "16px 0 0",
                letterSpacing: "0.02em",
              }}
            >
              {data.commanderName}
              {hasPartner && data.partnerName ? ` / ${data.partnerName}` : ""}
            </p>
          )}

          {/* Stats */}
          {stats.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 32,
                marginTop: 40,
              }}
            >
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p
                    style={{
                      fontSize: 36,
                      fontWeight: 900,
                      color: "#fff",
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(94, 234, 212, 0.6)",
                      margin: "6px 0 0",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — commander card(s) */}
        <div
          style={{
            width: 360,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {commanderImageUrl && !hasPartner ? (
            <div style={{ position: "relative" }}>
              {/* Glow behind card */}
              <div
                style={{
                  position: "absolute",
                  inset: -16,
                  borderRadius: 16,
                  background: "radial-gradient(ellipse, rgba(20, 184, 166, 0.2), transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={commanderImageUrl}
                alt={data.commanderName || "Commander"}
                style={{
                  position: "relative",
                  height: 420,
                  width: "auto",
                  borderRadius: 12,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                }}
              />
            </div>
          ) : commanderImageUrl && hasPartner ? (
            <div
              style={{
                position: "relative",
                height: 380,
                width: 340,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Glow behind cards */}
              <div
                style={{
                  position: "absolute",
                  inset: -20,
                  borderRadius: 20,
                  background: "radial-gradient(ellipse, rgba(20, 184, 166, 0.2), transparent 65%)",
                  filter: "blur(24px)",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={commanderImageUrl}
                alt={data.commanderName || "Commander"}
                style={{
                  position: "absolute",
                  height: 320,
                  width: "auto",
                  maxWidth: "55%",
                  objectFit: "contain",
                  borderRadius: 12,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                  transform: "rotate(-5deg) translateX(-20%)",
                  zIndex: 2,
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={partnerImageUrl!}
                alt={data.partnerName || "Partner"}
                style={{
                  position: "absolute",
                  height: 320,
                  width: "auto",
                  maxWidth: "55%",
                  objectFit: "contain",
                  borderRadius: 12,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                  transform: "rotate(5deg) translateX(20%)",
                  zIndex: 1,
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 280,
                height: 400,
                borderRadius: 12,
                border: "2px dashed rgba(20, 184, 166, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(94, 234, 212, 0.3)",
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              Commander Card
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "40px 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.1em",
          }}
        >
          EUROPEAN cEDH LEAGUE
        </span>
        <div
          style={{
            width: 40,
            height: 4,
            background: "#14b8a6",
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}
