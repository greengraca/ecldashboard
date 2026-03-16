import { DIMENSIONS, ASSETS, NOISE_BG, onAssetError } from "../shared/brand-constants";

/**
 * RESULTS DROP TOP 4 v2 — Finals hype template.
 * Golden yellow (#ffd514) accents matching ResultsDrop2.
 * 2×2 commander card grid with true card proportions (63:88).
 * Partners shown stacked: commander in front, partner behind offset down-right.
 * Auto-fills from brackets top4_order.
 */

interface BracketData {
  top16_winners: string[];
  top4_order: string[];
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

const POD_PATTERN = [0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3, 3, 2, 1, 0];

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

interface ResultsDropTop4v2Data {
  month: string;
  player1?: string;
  p1Commander?: string;
  p1Commander_imageUrl?: string;
  p1Commander_overrideUrl?: string;
  hasP1Partner?: boolean;
  p1Partner?: string;
  p1Partner_imageUrl?: string;
  p1Partner_overrideUrl?: string;
  player2?: string;
  p2Commander?: string;
  p2Commander_imageUrl?: string;
  p2Commander_overrideUrl?: string;
  hasP2Partner?: boolean;
  p2Partner?: string;
  p2Partner_imageUrl?: string;
  p2Partner_overrideUrl?: string;
  player3?: string;
  p3Commander?: string;
  p3Commander_imageUrl?: string;
  p3Commander_overrideUrl?: string;
  hasP3Partner?: boolean;
  p3Partner?: string;
  p3Partner_imageUrl?: string;
  p3Partner_overrideUrl?: string;
  player4?: string;
  p4Commander?: string;
  p4Commander_imageUrl?: string;
  p4Commander_overrideUrl?: string;
  hasP4Partner?: boolean;
  p4Partner?: string;
  p4Partner_imageUrl?: string;
  p4Partner_overrideUrl?: string;
  brackets?: BracketData;
  standings?: StandingsData;
  sponsorText?: string;
  streamDate?: string;
  streamTime?: string;
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
// MTG card aspect ratio: 63mm × 88mm
const CARD_RATIO = 63 / 88;

function CommanderCard({
  imageUrl,
  partnerImageUrl,
  seat,
  playerName,
  commanderLabel,
  cardW,
  cardH,
}: {
  imageUrl: string | null;
  partnerImageUrl: string | null;
  seat: number;
  playerName: string;
  commanderLabel?: string;
  cardW: number;
  cardH: number;
}) {
  const hasPartner = !!partnerImageUrl;
  // Commander shifts down ~15% and sits on top; partner behind at top
  const cmdShiftDown = Math.floor(cardH * 0.11);

  return (
    <div
      style={{
        width: cardW,
        height: cardH,
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        background: "#000",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* Partner image — behind, at top of frame */}
      {imageUrl && hasPartner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partnerImageUrl}
          alt="Partner"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            zIndex: 1,
          }}
        />
      )}

      {/* Commander image — on top, shifted down ~11% */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={commanderLabel || `Seat ${seat}`}
          style={{
            position: "absolute",
            top: hasPartner ? cmdShiftDown : 0,
            left: 0,
            width: "100%",
            height: hasPartner ? "89%" : "100%",
            objectFit: "cover",
            objectPosition: "top",
            boxShadow: hasPartner ? "0 -8px 25px rgba(0,0,0,0.8)" : "none",
            zIndex: 2,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: cardW,
            height: cardH,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(145deg, rgba(255, 213, 20, 0.06), rgba(255, 213, 20, 0.02))`,
          }}
        >
          <span
            style={{
              fontSize: 100,
              fontWeight: 900,
              color: "rgba(255, 213, 20, 0.1)",
              fontFamily: FONT,
            }}
          >
            {seat}
          </span>
        </div>
      )}

      {/* Bottom gradient — spans full frame */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "45%",
          background: "linear-gradient(transparent, rgba(0,0,0,0.95))",
          zIndex: 3,
        }}
      />

      {/* Seat badge */}
      <div
        style={{
          position: "absolute",
          top: 25,
          left: 20,
          width: 48,
          height: 48,
          borderRadius: 10,
          background: ACCENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 2px 16px rgba(255, 213, 20, 0.5)`,
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: "#09090b",
            fontFamily: FONT,
          }}
        >
          {seat}
        </span>
      </div>

      {/* Player info — spans full frame width */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 20px 30px",
          zIndex: 4,
        }}
      >
        <p
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#fff",
            margin: 0,
            lineHeight: 1.35,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          }}
        >
          {playerName}
        </p>
        <p
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: ACCENT,
            margin: "2px 0 0",
            lineHeight: 1.35,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: 0.8,
            textShadow: "0 1px 4px rgba(0,0,0,0.7)",
          }}
        >
          {commanderLabel || "Commander(s)"}
        </p>
      </div>
    </div>
  );
}

export default function ResultsDropTop4v2({ data }: { data: ResultsDropTop4v2Data }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);

  const standings = data.standings?.standings || [];
  const top4 = resolveTop4(standings, data.brackets);

  const player1 = data.player1 || top4[0]?.name || "Player 1";
  const player2 = data.player2 || top4[1]?.name || "Player 2";
  const player3 = data.player3 || top4[2]?.name || "Player 3";
  const player4 = data.player4 || top4[3]?.name || "Player 4";

  const p1Img = data.p1Commander_overrideUrl || data.p1Commander_imageUrl || null;
  const p1PartnerImg = data.hasP1Partner ? (data.p1Partner_overrideUrl || data.p1Partner_imageUrl || null) : null;
  const p2Img = data.p2Commander_overrideUrl || data.p2Commander_imageUrl || null;
  const p2PartnerImg = data.hasP2Partner ? (data.p2Partner_overrideUrl || data.p2Partner_imageUrl || null) : null;
  const p3Img = data.p3Commander_overrideUrl || data.p3Commander_imageUrl || null;
  const p3PartnerImg = data.hasP3Partner ? (data.p3Partner_overrideUrl || data.p3Partner_imageUrl || null) : null;
  const p4Img = data.p4Commander_overrideUrl || data.p4Commander_imageUrl || null;
  const p4PartnerImg = data.hasP4Partner ? (data.p4Partner_overrideUrl || data.p4Partner_imageUrl || null) : null;

  const p1Label = data.p1Commander
    ? (p1PartnerImg && data.p1Partner ? `${data.p1Commander} / ${data.p1Partner}` : data.p1Commander)
    : undefined;
  const p2Label = data.p2Commander
    ? (p2PartnerImg && data.p2Partner ? `${data.p2Commander} / ${data.p2Partner}` : data.p2Commander)
    : undefined;
  const p3Label = data.p3Commander
    ? (p3PartnerImg && data.p3Partner ? `${data.p3Commander} / ${data.p3Partner}` : data.p3Commander)
    : undefined;
  const p4Label = data.p4Commander
    ? (p4PartnerImg && data.p4Partner ? `${data.p4Commander} / ${data.p4Partner}` : data.p4Commander)
    : undefined;

  const sponsor = data.sponsorText || "SPONSORED BY DRAGON SHIELD";

  // Layout: fit card-ratio frames in 2×2 grid
  const padX = 56;
  const padY = 44;
  const gap = 36;
  const headerH = 230;
  const footerH = 80;
  const availW = width - padX * 2 - gap;
  const availH = height - headerH - footerH - gap;
  // Size cards to fit both constraints (width and height) at proper ratio
  const cardWFromWidth = Math.floor(availW / 2);
  const cardHFromWidth = Math.floor(cardWFromWidth / CARD_RATIO);
  const cardHFromHeight = Math.floor(availH / 2);
  const cardWFromHeight = Math.floor(cardHFromHeight * CARD_RATIO);
  // Pick the smaller so it fits
  const cardW = Math.min(cardWFromWidth, cardWFromHeight);
  const cardH = Math.floor(cardW / CARD_RATIO);
  const gridW = cardW * 2 + gap;
  const gridH = cardH * 2 + gap;

  return (
    <div
      style={{
        width,
        height,
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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

      {/* Golden glow top-right */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255, 213, 20, 0.08), transparent 70%)`,
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

      {/* Header */}
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
                fontSize: 140,
                fontWeight: 900,
                color: "#fff",
                margin: 0,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              FINALS
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
                TOP 4
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
          height: 4,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${ACCENT}, transparent 40%)`,
          boxShadow: `0 0 20px rgba(255, 213, 20, 0.3)`,
          marginBottom: 12,
        }}
      />

      {/* Stream CTA — absolute so it doesn't push cards */}
      <div
        style={{
          position: "absolute",
          top: headerH + 15,
          left: padX,
          right: padX,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
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
        {/* Date & Time badges */}
        {data.streamDate && (
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 8,
              padding: "5px 14px",
              letterSpacing: "0.08em",
              fontFamily: FONT,
              marginLeft: "auto",
            }}
          >
            {(() => {
              const today = new Date();
              const picked = new Date(data.streamDate + "T00:00:00");
              if (
                picked.getFullYear() === today.getFullYear() &&
                picked.getMonth() === today.getMonth() &&
                picked.getDate() === today.getDate()
              ) return "TODAY";
              return picked.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
            })()}
          </span>
        )}
        {data.streamTime && (
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: ACCENT,
              background: "rgba(255, 213, 20, 0.08)",
              border: `1px solid rgba(255, 213, 20, 0.2)`,
              borderRadius: 8,
              padding: "5px 14px",
              letterSpacing: "0.08em",
              fontFamily: FONT,
            }}
          >
            {data.streamTime}
          </span>
        )}
      </div>

      {/* 2×2 Commander grid — centered */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${cardW}px ${cardW}px`,
            gridTemplateRows: `${cardH}px ${cardH}px`,
            gap,
          }}
        >
          <CommanderCard imageUrl={p1Img} partnerImageUrl={p1PartnerImg} seat={1} playerName={player1} commanderLabel={p1Label} cardW={cardW} cardH={cardH} />
          <CommanderCard imageUrl={p2Img} partnerImageUrl={p2PartnerImg} seat={2} playerName={player2} commanderLabel={p2Label} cardW={cardW} cardH={cardH} />
          <CommanderCard imageUrl={p4Img} partnerImageUrl={p4PartnerImg} seat={4} playerName={player4} commanderLabel={p4Label} cardW={cardW} cardH={cardH} />
          <CommanderCard imageUrl={p3Img} partnerImageUrl={p3PartnerImg} seat={3} playerName={player3} commanderLabel={p3Label} cardW={cardW} cardH={cardH} />
        </div>

        {/* VS diamond — large, centered */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(45deg)",
            width: 110,
            height: 110,
            background: ACCENT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 50px rgba(255, 213, 20, 0.7), 0 0 100px rgba(255, 213, 20, 0.3)`,
            zIndex: 20,
          }}
        >
          <span
            style={{
              transform: "rotate(-45deg)",
              fontSize: 40,
              fontWeight: 900,
              color: "#09090b",
              fontFamily: FONT,
              letterSpacing: "-0.02em",
            }}
          >
            VS
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: footerH,
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
