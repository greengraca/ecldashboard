import { DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";

/**
 * RESULTS DROP 2 — Copy of ResultsDrop with golden yellow (#ffd514) accents,
 * different header layout (no logo), ECL logo in footer, sponsor line.
 */

interface StandingsEntry {
  rank: number;
  name: string;
  points: number;
  games: number;
  win_pct: number;
}

interface StandingsData {
  standings: StandingsEntry[];
}

interface ResultsDrop2Data {
  month: string;
  title?: string;
  standings?: StandingsData;
  totalPlayers?: string;
  totalGames?: string;
  sponsorText?: string;
}

const PLACEHOLDER: StandingsEntry[] = Array.from({ length: 16 }, (_, i) => ({
  rank: i + 1,
  name: `Player ${i + 1}`,
  points: Math.max(100 - i * 6, 10),
  games: Math.max(20 - i, 5),
  win_pct: Math.round(70 - i * 2.5),
}));

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
}

const FONT = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const ACCENT = "#ffd514";
const ACCENT_DIM = "rgba(255, 213, 20, 0.15)";

export default function ResultsDrop2({ data }: { data: ResultsDrop2Data }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);
  const standings = data.standings?.standings || PLACEHOLDER;
  const top16 = standings.slice(0, 16);

  const totalPlayers = data.totalPlayers || (standings.length > 0 ? String(standings.length) : "");
  const totalGames = data.totalGames || (standings.length > 0
    ? String(standings.reduce((sum, s) => sum + s.games, 0))
    : "");
  const sponsor = data.sponsorText || "SPONSORED BY DRAGON SHIELD";

  return (
    <div
      style={{
        width,
        height,
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      {/* Grain/noise texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
        }}
      />

      {/* Geometric accents */}
      <div
        style={{
          position: "absolute",
          top: 280,
          right: -50,
          width: 180,
          height: 180,
          border: `2px solid ${ACCENT_DIM}`,
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 300,
          left: -50,
          width: 140,
          height: 140,
          border: `2px solid ${ACCENT_DIM}`,
          transform: "rotate(45deg)",
        }}
      />

      {/* Neon stripe — right edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 6,
          height: "100%",
          background: `linear-gradient(180deg, transparent 5%, ${ACCENT} 25%, ${ACCENT} 75%, transparent 95%)`,
          opacity: 0.6,
        }}
      />

      {/* Header — RESULTS + month/cut + ECL logo */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "44px 56px 0",
        }}
      >
        {/* Title row: RESULTS + month/cut on left, ECL logo on right */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", margin: "40px 0 0" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
            <h1
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: "#fff",
                margin: 0,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              {data.title || "RESULTS"}
            </h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.2em",
                  lineHeight: 1.2,
                }}
              >
                {monthLabel}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.15em",
                  lineHeight: 1.2,
                }}
              >
                TOP 16 CUT
              </span>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.eclLogo}
            alt="ECL"
            onError={onAssetError}
            style={{ height: 64, width: "auto", opacity: 0.8 }}
          />
        </div>
        <div
          style={{
            width: 80,
            height: 5,
            background: ACCENT,
            borderRadius: 3,
            margin: "12px 0 0",
            boxShadow: `0 0 16px ${ACCENT}`,
          }}
        />

        {/* Column headers — PLAYER at left margin, stats aligned with row data */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 12px 12px",
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255, 213, 20, 0.4)",
              letterSpacing: "0.15em",
            }}
          >
            PLAYER
          </span>
          <span
            style={{
              width: 56,
              textAlign: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255, 213, 20, 0.4)",
              letterSpacing: "0.15em",
            }}
          >
            GP
          </span>
          <span
            style={{
              width: 68,
              textAlign: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255, 213, 20, 0.4)",
              letterSpacing: "0.15em",
            }}
          >
            OW%
          </span>
          <span
            style={{
              width: 68,
              textAlign: "right",
              paddingRight: 14,
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255, 213, 20, 0.4)",
              letterSpacing: "0.15em",
            }}
          >
            PTS
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
          padding: "0 56px",
          gap: 0,
        }}
      >
        {top16.map((player, i) => {
          const rank = i + 1;
          const isFirst = rank === 1;
          const isTop4 = rank <= 4;

          return (
            <div
              key={player.name + i}
              style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                padding: "0 12px",
                background: isFirst
                  ? "linear-gradient(90deg, rgba(255, 213, 20, 0.1), transparent)"
                  : isTop4
                    ? "linear-gradient(90deg, rgba(255, 213, 20, 0.04), transparent)"
                    : "transparent",
                borderLeft: isTop4 ? `3px solid ${ACCENT}` : "3px solid transparent",
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
                    ? ACCENT
                    : isTop4
                      ? "rgba(255, 213, 20, 0.12)"
                      : "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 900,
                  color: isFirst ? "#09090b" : isTop4 ? ACCENT : "rgba(255,255,255,0.3)",
                  flexShrink: 0,
                }}
              >
                {rank}
              </div>

              {/* Name */}
              <p
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: isTop4 ? 700 : 400,
                  color: isFirst ? ACCENT : isTop4 ? "#fff" : "rgba(255,255,255,0.7)",
                  margin: 0,
                  paddingLeft: 14,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {player.name}
              </p>

              {/* Games */}
              <p
                style={{
                  width: 56,
                  textAlign: "center",
                  fontSize: 16,
                  color: "rgba(255,255,255,0.35)",
                  margin: 0,
                }}
              >
                {player.games}
              </p>

              {/* OW% */}
              <p
                style={{
                  width: 68,
                  textAlign: "center",
                  fontSize: 16,
                  color: "rgba(255,255,255,0.5)",
                  margin: 0,
                }}
              >
                {player.win_pct}%
              </p>

              {/* Points */}
              <p
                style={{
                  width: 68,
                  textAlign: "center",
                  fontSize: 20,
                  fontWeight: 900,
                  color: isFirst ? ACCENT : "#fff",
                  margin: 0,
                }}
              >
                {Math.round(player.points)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer — stats + ECL logo + sponsor */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0 56px 36px",
        }}
      >
        {/* Stats row + ECL logo */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 16,
          }}
        >
          {/* Stats */}
          <div style={{ display: "flex", gap: 48 }}>
            {totalPlayers && (
              <div>
                <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0 }}>
                  {totalPlayers}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.3)",
                    margin: "2px 0 0",
                    letterSpacing: "0.15em",
                  }}
                >
                  PLAYERS
                </p>
              </div>
            )}
            {totalGames && (
              <div>
                <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0 }}>
                  {totalGames}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.3)",
                    margin: "2px 0 0",
                    letterSpacing: "0.15em",
                  }}
                >
                  GAMES
                </p>
              </div>
            )}
          </div>

          {/* CA + CEDHPT Logos */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.commanderArenaLogo}
              alt="Commander Arena"
              onError={onAssetError}
              style={{ height: 60, width: "auto", opacity: 0.8 }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.cedhPtLogo}
              alt="cEDH PT"
              onError={onAssetError}
              style={{ height: 60, width: "auto", opacity: 0.8 }}
            />
          </div>
        </div>

        {/* Sponsor line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.1em",
            }}
          >
            EUROPEAN cEDH LEAGUE - {sponsor}
          </span>
          <div
            style={{
              width: 28,
              height: 28,
              border: `2px solid ${ACCENT}`,
              borderRadius: 4,
              opacity: 0.3,
            }}
          />
        </div>
      </div>
    </div>
  );
}
