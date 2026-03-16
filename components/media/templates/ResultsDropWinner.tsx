import { DIMENSIONS, ASSETS, NOISE_BG, onAssetError } from "../shared/brand-constants";

/**
 * RESULTS DROP WINNER — Champion spotlight template.
 * Golden yellow (#ffd514) accents matching ResultsDropTop4v2.
 * Large winner commander card(s) with dramatic golden glow.
 * Supports partner commanders (overlapping cards).
 * Runner-ups shown smaller below. Used AFTER the finals — winner decided.
 */

interface BracketData {
  top16_winners: string[];
  top4_order: string[];
  top4_winner?: string | null;
}

interface StandingsEntry {
  uid: string;
  name: string;
  games: number;
}

interface StandingsData {
  standings: StandingsEntry[];
  totalPlayers?: number;
}

// Snake-draft pod seeding (same as Players page)
const POD_PATTERN = [0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3, 3, 2, 1, 0];

/** Derive the 4 finalists from standings + bracket data, matching Players page logic. */
function resolveTop4(
  standings: StandingsEntry[],
  brackets?: BracketData,
): StandingsEntry[] {
  if (standings.length === 0) return [];
  if (!brackets?.top16_winners?.length) return standings.slice(0, 4);

  const pods: StandingsEntry[][] = [[], [], [], []];
  for (let i = 0; i < Math.min(standings.length, 16); i++) {
    pods[POD_PATTERN[i]].push(standings[i]);
  }

  const winners: StandingsEntry[] = [];
  for (let i = 0; i < 4; i++) {
    const winner = pods[i]?.find((p) => brackets.top16_winners.includes(p.uid));
    if (winner) winners.push(winner);
  }

  if (brackets.top4_order?.length > 0 && winners.length === 4) {
    const byUid = new Map(winners.map((w) => [w.uid, w]));
    const ordered: StandingsEntry[] = [];
    for (const uid of brackets.top4_order) {
      const p = byUid.get(uid);
      if (p) {
        ordered.push(p);
        byUid.delete(uid);
      }
    }
    for (const p of byUid.values()) ordered.push(p);
    return ordered;
  }

  return winners;
}

interface ResultsDropWinnerData {
  month: string;
  winner?: string;
  winnerCommander?: string;
  winnerCommander_imageUrl?: string;
  winnerCommander_overrideUrl?: string;
  hasWinnerPartner?: boolean;
  winnerPartner?: string;
  winnerPartner_imageUrl?: string;
  winnerPartner_overrideUrl?: string;
  second?: string;
  secondCommander?: string;
  secondCommander_imageUrl?: string;
  secondCommander_overrideUrl?: string;
  hasSecondPartner?: boolean;
  secondPartner?: string;
  secondPartner_imageUrl?: string;
  secondPartner_overrideUrl?: string;
  third?: string;
  thirdCommander?: string;
  thirdCommander_imageUrl?: string;
  thirdCommander_overrideUrl?: string;
  hasThirdPartner?: boolean;
  thirdPartner?: string;
  thirdPartner_imageUrl?: string;
  thirdPartner_overrideUrl?: string;
  fourth?: string;
  fourthCommander?: string;
  fourthCommander_imageUrl?: string;
  fourthCommander_overrideUrl?: string;
  hasFourthPartner?: boolean;
  fourthPartner?: string;
  fourthPartner_imageUrl?: string;
  fourthPartner_overrideUrl?: string;
  brackets?: BracketData;
  standings?: StandingsData;
  totalPlayers?: string;
  totalGames?: string;
  sponsorText?: string;
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  // Data is for the previous month relative to the selected month
  const date = new Date(y, m - 2);
  return date.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
}

const FONT = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const ACCENT = "#ffd514";

export default function ResultsDropWinner({ data }: { data: ResultsDropWinnerData }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);
  const padX = 56;
  const headerH = 230;

  // Derive top 4 finalists using same logic as Players page
  const standings = data.standings?.standings || [];
  const top4 = resolveTop4(standings, data.brackets);
  const uidToName = new Map(standings.filter((s) => s.uid).map((s) => [s.uid, s.name]));
  const bracketWinnerUid = data.brackets?.top4_winner;

  const winner = data.winner || (bracketWinnerUid ? uidToName.get(bracketWinnerUid) : undefined) || top4[0]?.name || "";
  const second = data.second || top4[1]?.name || "";
  const third = data.third || top4[2]?.name || "";
  const fourth = data.fourth || top4[3]?.name || "";

  // Winner commander images (single or partner)
  const winnerImg = data.winnerCommander_overrideUrl || data.winnerCommander_imageUrl || null;
  const winnerPartnerImg = data.hasWinnerPartner
    ? (data.winnerPartner_overrideUrl || data.winnerPartner_imageUrl || null)
    : null;

  // Winner commander label
  const winnerCmdLabel = data.winnerCommander
    ? (winnerPartnerImg && data.winnerPartner
      ? `${data.winnerCommander} / ${data.winnerPartner}`
      : data.winnerCommander)
    : undefined;

  // Runner-up commander images + partner support
  const secondImg = data.secondCommander_overrideUrl || data.secondCommander_imageUrl || null;
  const secondPartnerImg = data.hasSecondPartner
    ? (data.secondPartner_overrideUrl || data.secondPartner_imageUrl || null)
    : null;
  const thirdImg = data.thirdCommander_overrideUrl || data.thirdCommander_imageUrl || null;
  const thirdPartnerImg = data.hasThirdPartner
    ? (data.thirdPartner_overrideUrl || data.thirdPartner_imageUrl || null)
    : null;
  const fourthImg = data.fourthCommander_overrideUrl || data.fourthCommander_imageUrl || null;
  const fourthPartnerImg = data.hasFourthPartner
    ? (data.fourthPartner_overrideUrl || data.fourthPartner_imageUrl || null)
    : null;

  // Auto-fill stats
  const totalPlayers = data.totalPlayers || (data.standings?.totalPlayers ? String(data.standings.totalPlayers) : (standings.length > 0 ? String(standings.length) : ""));
  const totalGames = data.totalGames || (standings.length > 0
    ? String(standings.reduce((sum, s) => sum + s.games, 0))
    : "");
  const sponsor = data.sponsorText || "SPONSORED BY DRAGON SHIELD";

  const runnerUps = [
    {
      num: "02", name: second, label: "2ND",
      img: secondImg, partnerImg: secondPartnerImg,
      commander: data.secondCommander, partner: data.secondPartner,
      hasPartner: !!secondPartnerImg,
    },
    {
      num: "03", name: third, label: "3RD",
      img: thirdImg, partnerImg: thirdPartnerImg,
      commander: data.thirdCommander, partner: data.thirdPartner,
      hasPartner: !!thirdPartnerImg,
    },
    {
      num: "04", name: fourth, label: "4TH",
      img: fourthImg, partnerImg: fourthPartnerImg,
      commander: data.fourthCommander, partner: data.fourthPartner,
      hasPartner: !!fourthPartnerImg,
    },
  ].filter((p) => p.name);

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
      {/* Background smoke — lowest layer */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ASSETS.backgroundSmoke}
        alt=""
        onError={onAssetError}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "5% center",
          zIndex: 0,
          opacity: 0.3,
        }}
      />

      {/* Noise texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage: NOISE_BG,
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
          zIndex: 1,
        }}
      />

      {/* Golden radial glow behind winner card area */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -20%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255, 213, 20, 0.06) 0%, transparent 70%)`,
        }}
      />

      {/* Neon stripe — right edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 5,
          height: "100%",
          background: `linear-gradient(180deg, transparent 5%, ${ACCENT} 25%, ${ACCENT} 75%, transparent 95%)`,
          opacity: 0.5,
        }}
      />

      {/* Header — matching Top4v2 layout */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: headerH,
          padding: `0 ${padX}px`,
          display: "flex",
          alignItems: "flex-end",
          paddingBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <h1
              style={{
                fontSize: 110,
                fontWeight: 900,
                color: "#fff",
                margin: 0,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              CHAMPION
            </h1>
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.2em",
                  lineHeight: 1.3,
                }}
              >
                {monthLabel}
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: ACCENT,
                  letterSpacing: "0.15em",
                  lineHeight: 1.3,
                  opacity: 0.7,
                }}
              >
                WINNER
              </span>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.eclLogoOnly}
            alt="ECL"
            onError={onAssetError}
            style={{ height: 140, width: "auto", opacity: 0.95 }}
          />
        </div>
      </div>

      {/* Accent line */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: `calc(100% - ${padX * 2}px)`,
          marginLeft: padX,
          height: 4,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${ACCENT}, transparent 40%)`,
          boxShadow: `0 0 20px rgba(255, 213, 20, 0.3)`,
          marginBottom: 12,
        }}
      />

      {/* Stream CTA — absolute so it doesn't push content */}
      <div
        style={{
          position: "absolute",
          top: headerH + 15,
          left: padX,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#ef4444",
            boxShadow: "0 0 8px rgba(239,68,68,0.6)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.15em",
            fontFamily: FONT,
          }}
        >
          WATCH LIVE ON YOUTUBE
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: ACCENT,
            letterSpacing: "0.1em",
            fontFamily: FONT,
            opacity: 0.7,
          }}
        >
          /CEDHPT
        </span>
      </div>

      {/* Winner section — dominant */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: `24px ${padX}px 0`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Winner label + name */}
        <div style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 20 }}>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: ACCENT,
              lineHeight: 0.8,
              letterSpacing: "-0.04em",
              opacity: 0.9,
            }}
          >
            01
          </span>
          <div style={{ flex: 1, paddingTop: 6 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: ACCENT,
                margin: 0,
                letterSpacing: "0.25em",
              }}
            >
              CHAMPION
            </p>
            <h2
              style={{
                fontSize: 52,
                fontWeight: 900,
                color: "#fff",
                margin: "6px 0 0",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {winner || "Winner"}
            </h2>
            {winnerCmdLabel && (
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: "rgba(255, 213, 20, 0.55)",
                  margin: "10px 0 0",
                }}
              >
                {winnerCmdLabel}
              </p>
            )}
          </div>
        </div>

        {/* Large winner commander card(s) */}
        {winnerImg && !winnerPartnerImg ? (
          // Single commander — large centered card
          <div
            style={{
              marginTop: 28,
              width: 440,
              height: 620,
              borderRadius: 16,
              overflow: "hidden",
              border: `3px solid rgba(255, 213, 20, 0.35)`,
              boxShadow: `0 8px 50px rgba(0,0,0,0.6), 0 0 80px rgba(255, 213, 20, 0.12), 0 0 120px rgba(255, 213, 20, 0.06)`,
              background: `linear-gradient(145deg, rgba(255, 213, 20, 0.06), rgba(255, 213, 20, 0.02))`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={winnerImg}
              alt={data.winnerCommander || "Champion"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
              }}
            />
          </div>
        ) : winnerImg && winnerPartnerImg ? (
          // Partner commanders — overlapping with golden glow
          <div
            style={{
              marginTop: 28,
              width: 560,
              height: 580,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Glow behind cards */}
            <div
              style={{
                position: "absolute",
                inset: -24,
                borderRadius: 24,
                background: "radial-gradient(ellipse, rgba(255, 213, 20, 0.1), transparent 65%)",
                filter: "blur(20px)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={winnerImg}
              alt={data.winnerCommander || "Commander"}
              style={{
                position: "absolute",
                height: 480,
                width: "auto",
                maxWidth: "52%",
                objectFit: "contain",
                borderRadius: 14,
                boxShadow: `0 12px 50px rgba(0,0,0,0.6), 0 0 40px rgba(255, 213, 20, 0.08)`,
                transform: "rotate(-5deg) translateX(-20%)",
                zIndex: 2,
                border: `2px solid rgba(255, 213, 20, 0.2)`,
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={winnerPartnerImg}
              alt={data.winnerPartner || "Partner"}
              style={{
                position: "absolute",
                height: 480,
                width: "auto",
                maxWidth: "52%",
                objectFit: "contain",
                borderRadius: 14,
                boxShadow: `0 12px 50px rgba(0,0,0,0.6), 0 0 40px rgba(255, 213, 20, 0.08)`,
                transform: "rotate(5deg) translateX(20%)",
                zIndex: 1,
                border: `2px solid rgba(255, 213, 20, 0.2)`,
              }}
            />
          </div>
        ) : (
          // Placeholder
          <div
            style={{
              marginTop: 28,
              width: 440,
              height: 620,
              borderRadius: 16,
              overflow: "hidden",
              border: `3px solid rgba(255, 213, 20, 0.35)`,
              boxShadow: `0 8px 50px rgba(0,0,0,0.6), 0 0 80px rgba(255, 213, 20, 0.12), 0 0 120px rgba(255, 213, 20, 0.06)`,
              background: `linear-gradient(145deg, rgba(255, 213, 20, 0.06), rgba(255, 213, 20, 0.02))`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 120,
                fontWeight: 900,
                color: "rgba(255, 213, 20, 0.08)",
              }}
            >
              01
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          margin: `28px ${padX}px 0`,
          height: 1,
          background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent 80%)",
        }}
      />

      {/* Runner-ups — 3 slots in a row */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: `20px ${padX}px 0`,
          display: "flex",
          gap: 16,
          justifyContent: "center",
        }}
      >
        {runnerUps.map((p) => {
          const cmdLabel = p.commander
            ? (p.hasPartner && p.partner ? `${p.commander} / ${p.partner}` : p.commander)
            : undefined;

          return (
            <div
              key={p.num}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 280,
              }}
            >
              {/* Small commander card(s) */}
              <div
                style={{
                  width: 220,
                  height: 180,
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.02)",
                  position: "relative",
                }}
              >
                {p.img && !p.hasPartner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.img}
                    alt={p.commander || p.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: "center",
                    }}
                  />
                ) : p.img && p.hasPartner && p.partnerImg ? (
                  // Overlapping partner cards (small)
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.img}
                      alt={p.commander || "Commander"}
                      style={{
                        position: "absolute",
                        height: "85%",
                        width: "auto",
                        maxWidth: "55%",
                        objectFit: "contain",
                        borderRadius: 6,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                        transform: "rotate(-5deg) translateX(-15%)",
                        zIndex: 2,
                      }}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.partnerImg}
                      alt={p.partner || "Partner"}
                      style={{
                        position: "absolute",
                        height: "85%",
                        width: "auto",
                        maxWidth: "55%",
                        objectFit: "contain",
                        borderRadius: 6,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                        transform: "rotate(5deg) translateX(15%)",
                        zIndex: 1,
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        color: "rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      {p.num}
                    </span>
                  </div>
                )}
              </div>
              {/* Info */}
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.25)",
                    margin: 0,
                    letterSpacing: "0.2em",
                  }}
                >
                  {p.label} PLACE
                </p>
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.8)",
                    margin: "4px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </p>
                {cmdLabel && (
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "rgba(255, 213, 20, 0.35)",
                      margin: "2px 0 0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cmdLabel}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — matching Top4v2 layout */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: "auto",
          width: "100%",
          height: 80,
          padding: `0 ${padX}px`,
          paddingBottom: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.commanderArenaLogo}
            alt="Commander Arena"
            onError={onAssetError}
            style={{ height: 54, width: "auto", opacity: 0.8 }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.cedhPtLogo}
            alt="cEDH PT"
            onError={onAssetError}
            style={{ height: 60, width: "auto", opacity: 0.8 }}
          />
          {totalPlayers && (
            <div style={{ marginLeft: 20 }}>
              <p style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>
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
              <p style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>
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
        <span
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "0.1em",
          }}
        >
          EUROPEAN cEDH LEAGUE - {sponsor}
        </span>
      </div>
    </div>
  );
}
