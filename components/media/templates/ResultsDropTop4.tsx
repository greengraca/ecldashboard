import { DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";

/**
 * RESULTS DROP TOP 4 — Brutalist layout with neon lime accents.
 * Bold winner callout + 2nd-4th placements. Dark with electric lime.
 */

interface BracketData {
  top4_order: Array<{ uid: string; name: string }>;
  top4_winner?: { uid: string; name: string } | null;
}

interface StandingsData {
  standings: Array<{ games: number }>;
}

interface ResultsDropTop4Data {
  month: string;
  winner: string;
  winnerCommander?: string;
  second?: string;
  third?: string;
  fourth?: string;
  totalGames?: string;
  totalPlayers?: string;
  brackets?: BracketData;
  standings?: StandingsData;
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
}

const FONT = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const NEON = "#a3e635";
const NEON_DIM = "rgba(163, 230, 53, 0.15)";

export default function ResultsDropTop4({ data }: { data: ResultsDropTop4Data }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);

  // Auto-fill from bracket data when manual fields are empty
  const top4 = data.brackets?.top4_order || [];
  const winner = data.winner || top4[0]?.name || "";
  const second = data.second || top4[1]?.name || "";
  const third = data.third || top4[2]?.name || "";
  const fourth = data.fourth || top4[3]?.name || "";

  // Auto-fill stats from standings
  const standings = data.standings?.standings || [];
  const totalPlayers = data.totalPlayers || (standings.length > 0 ? String(standings.length) : "");
  const totalGames = data.totalGames || (standings.length > 0
    ? String(standings.reduce((sum, s) => sum + s.games, 0))
    : "");

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
          top: 180,
          right: -40,
          width: 200,
          height: 200,
          border: `2px solid ${NEON_DIM}`,
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 400,
          left: -60,
          width: 160,
          height: 160,
          border: `2px solid ${NEON_DIM}`,
          transform: "rotate(45deg)",
        }}
      />

      {/* Neon stripe — right edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 4,
          height: "100%",
          background: `linear-gradient(180deg, transparent 5%, ${NEON} 25%, ${NEON} 75%, transparent 95%)`,
          opacity: 0.6,
        }}
      />

      {/* Top — Logo + FINALS header */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "64px 64px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.eclLogo}
            alt="ECL"
            onError={onAssetError}
            style={{ height: 48, width: "auto", opacity: 0.8 }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.2em",
            }}
          >
            {monthLabel}
          </span>
        </div>

        {/* Big "FINALS" */}
        <h1
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: "#fff",
            margin: "40px 0 0",
            lineHeight: 0.85,
            letterSpacing: "-0.04em",
          }}
        >
          FINALS
        </h1>
        <p
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "rgba(255,255,255,0.25)",
            margin: "12px 0 0",
            letterSpacing: "0.15em",
          }}
        >
          TOP 4 RESULTS
        </p>
        <div
          style={{
            width: 80,
            height: 6,
            background: NEON,
            borderRadius: 3,
            margin: "24px 0 0",
            boxShadow: `0 0 16px ${NEON}`,
          }}
        />
      </div>

      {/* Winner section — large and prominent */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "48px 64px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 20,
          }}
        >
          {/* Big "01" */}
          <span
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: NEON,
              lineHeight: 0.8,
              letterSpacing: "-0.04em",
              opacity: 0.9,
            }}
          >
            01
          </span>
          <div style={{ flex: 1, paddingTop: 8 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: NEON,
                margin: 0,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
            >
              CHAMPION
            </p>
            <h2
              style={{
                fontSize: 52,
                fontWeight: 900,
                color: "#fff",
                margin: "4px 0 0",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {winner || "Winner"}
            </h2>
            {data.winnerCommander && (
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: "rgba(163, 230, 53, 0.6)",
                  margin: "8px 0 0",
                }}
              >
                {data.winnerCommander}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          margin: "32px 64px",
          height: 1,
          background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)",
        }}
      />

      {/* 2nd-4th placements */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0 64px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {[
          { num: "02", name: second, label: "2ND PLACE" },
          { num: "03", name: third, label: "3RD PLACE" },
          { num: "04", name: fourth, label: "4TH PLACE" },
        ]
          .filter((p) => p.name)
          .map((p) => (
            <div
              key={p.num}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.12)",
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  width: 70,
                }}
              >
                {p.num}
              </span>
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.3)",
                    margin: 0,
                    letterSpacing: "0.15em",
                  }}
                >
                  {p.label}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.85)",
                    margin: "2px 0 0",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {p.name}
                </p>
              </div>
            </div>
          ))}
      </div>

      {/* Bottom stats bar */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: "auto",
          padding: "0 64px 72px",
        }}
      >
        {(totalGames || totalPlayers) && (
          <div
            style={{
              display: "flex",
              gap: 48,
              padding: "24px 0",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {totalPlayers && (
              <div>
                <p style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0 }}>
                  {totalPlayers}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.3)",
                    margin: "4px 0 0",
                    letterSpacing: "0.15em",
                  }}
                >
                  PLAYERS
                </p>
              </div>
            )}
            {totalGames && (
              <div>
                <p style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0 }}>
                  {totalGames}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.3)",
                    margin: "4px 0 0",
                    letterSpacing: "0.15em",
                  }}
                >
                  GAMES
                </p>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.1em",
            }}
          >
            EUROPEAN cEDH LEAGUE
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              border: `2px solid ${NEON}`,
              borderRadius: 4,
              opacity: 0.3,
            }}
          />
        </div>
      </div>
    </div>
  );
}
