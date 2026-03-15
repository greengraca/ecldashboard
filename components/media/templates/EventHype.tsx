import { DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";

/**
 * EVENT HYPE — Sci-fi inspired announcement with glowing borders.
 * Cyan/electric blue neon on deep dark, grid scanlines, and orbital rings.
 * Maximum drama for event announcements and countdowns.
 */

interface EventHypeData {
  month: string;
  eventName: string;
  eventDate?: string;
  eventTime?: string;
  description?: string;
  streamUrl?: string;
  highlight?: string; // e.g. "FINALS", "SEMI-FINALS", "SEASON OPENER"
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
}

function formatEventDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

const FONT = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const CYAN = "#22d3ee";
const CYAN_DIM = "rgba(34, 211, 238, 0.12)";

export default function EventHype({ data }: { data: EventHypeData }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);
  const eventDateFormatted = data.eventDate ? formatEventDate(data.eventDate) : null;
  const highlight = data.highlight || "UPCOMING";

  return (
    <div
      style={{
        width,
        height,
        background: "#050507",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      {/* Subtle dark gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 40%, #0c1220 0%, #050507 70%)",
        }}
      />

      {/* Scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)",
          pointerEvents: "none",
        }}
      />

      {/* Noise */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
        }}
      />

      {/* Orbital ring — large */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800,
          height: 800,
          borderRadius: "50%",
          border: `1px solid ${CYAN_DIM}`,
        }}
      />
      {/* Orbital ring — medium */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(30deg)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          border: `1px solid rgba(34, 211, 238, 0.06)`,
        }}
      />
      {/* Orbital ring — small with glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-15deg)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: `1px solid rgba(34, 211, 238, 0.08)`,
          boxShadow: `0 0 40px rgba(34, 211, 238, 0.04)`,
        }}
      />

      {/* Cyan glow — center */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      {/* Corner brackets */}
      {[
        { top: 48, left: 48, borderTop: `2px solid ${CYAN}`, borderLeft: `2px solid ${CYAN}` },
        { top: 48, right: 48, borderTop: `2px solid ${CYAN}`, borderRight: `2px solid ${CYAN}` },
        { bottom: 48, left: 48, borderBottom: `2px solid ${CYAN}`, borderLeft: `2px solid ${CYAN}` },
        { bottom: 48, right: 48, borderBottom: `2px solid ${CYAN}`, borderRight: `2px solid ${CYAN}` },
      ].map((style, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...style,
            width: 40,
            height: 40,
            opacity: 0.4,
          }}
        />
      ))}

      {/* Top — logo + month */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "80px 72px 0",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 48, width: "auto", opacity: 0.85 }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.2em",
          }}
        >
          {monthLabel}
        </span>
      </div>

      {/* Center — event content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 72px",
          gap: 32,
        }}
      >
        {/* Highlight tag */}
        <div
          style={{
            background: CYAN_DIM,
            border: `1px solid rgba(34, 211, 238, 0.25)`,
            borderRadius: 4,
            padding: "8px 28px",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: CYAN,
              letterSpacing: "0.2em",
            }}
          >
            {highlight}
          </span>
        </div>

        {/* Event name — hero text */}
        <h1
          style={{
            fontSize: data.eventName && data.eventName.length > 15 ? 72 : 96,
            fontWeight: 900,
            color: "#fff",
            margin: 0,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            textShadow: `0 0 60px rgba(34, 211, 238, 0.15)`,
            maxWidth: 900,
          }}
        >
          {data.eventName || "EVENT NAME"}
        </h1>

        {/* Cyan line */}
        <div
          style={{
            width: 120,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${CYAN}, transparent)`,
            borderRadius: 2,
            boxShadow: `0 0 20px rgba(34, 211, 238, 0.4)`,
          }}
        />

        {/* Description */}
        {data.description && (
          <p
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: "rgba(255,255,255,0.55)",
              margin: 0,
              lineHeight: 1.5,
              maxWidth: 700,
            }}
          >
            {data.description}
          </p>
        )}

        {/* Date + time block */}
        {(eventDateFormatted || data.eventTime) && (
          <div
            style={{
              marginTop: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "24px 48px",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              gap: 40,
            }}
          >
            {eventDateFormatted && (
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: CYAN,
                    margin: 0,
                    letterSpacing: "0.2em",
                  }}
                >
                  DATE
                </p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#fff",
                    margin: "4px 0 0",
                    letterSpacing: "0.02em",
                  }}
                >
                  {eventDateFormatted}
                </p>
              </div>
            )}
            {eventDateFormatted && data.eventTime && (
              <div
                style={{
                  width: 1,
                  height: 40,
                  background: "rgba(255,255,255,0.1)",
                }}
              />
            )}
            {data.eventTime && (
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: CYAN,
                    margin: 0,
                    letterSpacing: "0.2em",
                  }}
                >
                  TIME
                </p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#fff",
                    margin: "4px 0 0",
                  }}
                >
                  {data.eventTime}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom — stream URL + branding */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0 72px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {data.streamUrl && (
          <p
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: CYAN,
              margin: 0,
              opacity: 0.7,
              wordBreak: "break-all",
            }}
          >
            {data.streamUrl}
          </p>
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "0.15em",
          }}
        >
          EUROPEAN cEDH LEAGUE
        </span>
      </div>
    </div>
  );
}
