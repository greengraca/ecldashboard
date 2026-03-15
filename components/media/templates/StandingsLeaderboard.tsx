import { BRAND, FONTS, DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";
import BrandFooter from "../shared/BrandFooter";

interface StandingsPlayer {
  name: string;
  points: number;
  games: number;
  ow_percent: number;
}

interface StandingsLeaderboardData {
  month: string;
  title?: string;
  standings?: StandingsPlayer[];
  showCount?: string; // "8", "10", "16"
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long" });
}

const PLACEHOLDER_STANDINGS: StandingsPlayer[] = Array.from({ length: 16 }, (_, i) => ({
  name: `Player ${i + 1}`,
  points: Math.max(100 - i * 6, 10),
  games: Math.max(20 - i, 5),
  ow_percent: Math.round(70 - i * 2.5),
}));

export default function StandingsLeaderboard({ data }: { data: StandingsLeaderboardData }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);
  const title = data.title || `${monthLabel} Standings`;
  const showCount = parseInt(data.showCount || "16", 10);

  const standings = (data.standings || PLACEHOLDER_STANDINGS).slice(0, showCount);

  const availableHeight = height - 440;
  const rowHeight = Math.min(80, Math.floor(availableHeight / showCount));
  const fontSize = rowHeight > 60 ? 20 : 17;
  const smallFont = rowHeight > 60 ? 14 : 12;

  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(170deg, #030c1c 0%, #081e42 25%, #0c2a56 50%, #071a3a 75%, #020a18 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONTS.cinzel,
      }}
    >
      {/* Soft blue orb — top */}
      <div
        style={{
          position: "absolute",
          top: -60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(40, 100, 200, 0.2) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Subtle blue orb — bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: -80,
          right: -60,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(25, 70, 170, 0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Horizontal grid lines */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0.035 }}>
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: i * 80,
              height: 1,
              background: "rgba(100, 160, 255, 1)",
            }}
          />
        ))}
      </div>

      {/* Vertical accent lines */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0.03 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 80 + i * 80,
              top: 0,
              width: 1,
              height: "100%",
              background: "rgba(100, 160, 255, 1)",
            }}
          />
        ))}
      </div>

      {/* Smoke overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${ASSETS.backgroundSmoke})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.06,
          mixBlendMode: "soft-light",
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "50px 40px 20px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 80, width: "auto", margin: "0 auto 12px", display: "block" }}
        />
        <h1
          style={{
            fontSize: 38,
            fontWeight: 900,
            color: BRAND.textWhite,
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </h1>
        <div
          style={{
            width: 500,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${BRAND.gold}, transparent)`,
            margin: "16px auto 0",
          }}
        />

        {/* Column headers */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 60px 8px",
            gap: 12,
          }}
        >
          <span style={{ width: 48 }} />
          <span style={{ flex: 1, textAlign: "left", fontSize: 12, color: "rgba(130, 170, 220, 0.6)", letterSpacing: "0.1em" }}>
            PLAYER
          </span>
          <span style={{ width: 80, textAlign: "center", fontSize: 12, color: "rgba(130, 170, 220, 0.6)", letterSpacing: "0.1em" }}>
            PTS
          </span>
          <span style={{ width: 60, textAlign: "center", fontSize: 12, color: "rgba(130, 170, 220, 0.6)", letterSpacing: "0.1em" }}>
            GP
          </span>
          <span style={{ width: 80, textAlign: "center", fontSize: 12, color: "rgba(130, 170, 220, 0.6)", letterSpacing: "0.1em" }}>
            OW%
          </span>
        </div>
      </div>

      {/* Standings rows */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "0 60px",
          gap: 4,
        }}
      >
        {standings.map((player, i) => {
          const rank = i + 1;
          const isTop4 = rank <= 4;
          const isFirst = rank === 1;

          return (
            <div
              key={player.name + i}
              style={{
                display: "flex",
                alignItems: "center",
                height: rowHeight,
                padding: "0 16px",
                gap: 12,
                background: isFirst
                  ? "linear-gradient(90deg, rgba(212, 160, 23, 0.12), rgba(20, 60, 140, 0.08))"
                  : isTop4
                    ? "linear-gradient(90deg, rgba(212, 160, 23, 0.05), transparent)"
                    : "transparent",
                borderLeft: isTop4 ? `3px solid ${BRAND.gold}` : "3px solid transparent",
                borderRadius: 4,
              }}
            >
              {/* Rank */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: isFirst ? 6 : "50%",
                  background: isFirst
                    ? `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldDark})`
                    : isTop4
                      ? "rgba(212, 160, 23, 0.15)"
                      : "rgba(100, 160, 255, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 900,
                  color: isFirst ? "#050d1a" : isTop4 ? BRAND.gold : "rgba(130, 170, 220, 0.5)",
                  flexShrink: 0,
                }}
              >
                {rank}
              </div>

              {/* Name */}
              <p
                style={{
                  flex: 1,
                  fontSize,
                  fontWeight: isTop4 ? 700 : 400,
                  color: isFirst ? BRAND.gold : isTop4 ? BRAND.textWhite : "rgba(200, 215, 240, 0.8)",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {player.name}
              </p>

              {/* Points */}
              <p
                style={{
                  width: 80,
                  textAlign: "center",
                  fontSize,
                  fontWeight: 900,
                  color: isFirst ? BRAND.gold : BRAND.textWhite,
                  margin: 0,
                }}
              >
                {player.points}
              </p>

              {/* Games */}
              <p
                style={{
                  width: 60,
                  textAlign: "center",
                  fontSize: smallFont,
                  color: "rgba(130, 170, 220, 0.5)",
                  margin: 0,
                }}
              >
                {player.games}
              </p>

              {/* OW% */}
              <p
                style={{
                  width: 80,
                  textAlign: "center",
                  fontSize: smallFont,
                  color: "rgba(200, 215, 240, 0.7)",
                  margin: 0,
                }}
              >
                {player.ow_percent}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <BrandFooter width={width} />
      </div>
    </div>
  );
}
