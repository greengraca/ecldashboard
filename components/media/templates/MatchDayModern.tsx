import { DIMENSIONS, ASSETS, NOISE_BG, onAssetError } from "../shared/brand-constants";

/**
 * MATCH DAY — Ultra-modern oversized typography story.
 * Electric violet/magenta gradient, geometric grid overlay, bold type-as-hero.
 * Deliberately breaks ECL brand style for maximum social media impact.
 */

interface MatchDayModernData {
  month: string;
  subtitle?: string;
  streamUrl?: string;
  streamTime?: string;
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
}

const FONT = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const FONT_BOLD = FONT;

export default function MatchDayModern({ data }: { data: MatchDayModernData }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);

  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(135deg, #0a0015 0%, #1a0035 20%, #3b0764 45%, #6d1a9c 65%, #4c1d95 85%, #1e0040 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      {/* Noise texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          backgroundImage: NOISE_BG,
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
        }}
      />

      {/* Grid overlay */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0.06 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={`h${i}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: i * 96,
              height: 1,
              background: "#fff",
            }}
          />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={`v${i}`}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: i * 96,
              width: 1,
              background: "#fff",
            }}
          />
        ))}
      </div>

      {/* Large blurred magenta orb */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          right: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Neon accent line — left edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 6,
          height: "100%",
          background: "linear-gradient(180deg, transparent 10%, #c084fc 30%, #e879f9 50%, #c084fc 70%, transparent 90%)",
        }}
      />

      {/* Top section — small ECL logo + month */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "72px 64px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 56, width: "auto", opacity: 0.9 }}
        />
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.2em",
            fontFamily: FONT,
          }}
        >
          {monthLabel}
        </span>
      </div>

      {/* Center — OVERSIZED TYPOGRAPHY */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 64px",
        }}
      >
        {/* "MATCH" — massive, clipped at edges for drama */}
        <div style={{ overflow: "hidden", marginLeft: -20 }}>
          <h1
            style={{
              fontSize: 180,
              fontWeight: 900,
              color: "#fff",
              margin: 0,
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              fontFamily: FONT_BOLD,
            }}
          >
            MATCH
          </h1>
        </div>
        <div style={{ overflow: "hidden", marginLeft: -20 }}>
          <h1
            style={{
              fontSize: 180,
              fontWeight: 900,
              margin: 0,
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              fontFamily: FONT_BOLD,
              // Gradient text via background-clip
              background: "linear-gradient(90deg, #e879f9, #c084fc, #818cf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            DAY
          </h1>
        </div>

        {/* Neon divider */}
        <div
          style={{
            width: 160,
            height: 4,
            background: "linear-gradient(90deg, #e879f9, #818cf8)",
            borderRadius: 2,
            margin: "40px 0",
            boxShadow: "0 0 20px rgba(232, 121, 249, 0.5)",
          }}
        />

        {/* Subtitle / tagline */}
        <p
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            margin: 0,
            letterSpacing: "0.02em",
            lineHeight: 1.4,
            maxWidth: 600,
            fontFamily: FONT,
          }}
        >
          {data.subtitle || "European cEDH League"}
        </p>

        {/* Stream time */}
        {data.streamTime && (
          <div
            style={{
              marginTop: 32,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "12px 24px",
              alignSelf: "flex-start",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 12px rgba(239, 68, 68, 0.6)",
              }}
            />
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                fontFamily: FONT,
              }}
            >
              {data.streamTime}
            </span>
          </div>
        )}
      </div>

      {/* Bottom — stream URL + geometric accent */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0 64px 72px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        {data.streamUrl && (
          <p
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              margin: 0,
              wordBreak: "break-all",
              fontFamily: FONT,
              maxWidth: 500,
            }}
          >
            {data.streamUrl}
          </p>
        )}

        {/* Geometric accent — rotated square */}
        <div
          style={{
            width: 80,
            height: 80,
            border: "2px solid rgba(232, 121, 249, 0.3)",
            transform: "rotate(45deg)",
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}
