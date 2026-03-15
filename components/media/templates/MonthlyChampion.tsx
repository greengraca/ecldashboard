import { BRAND, FONTS, DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";
import BrandFooter from "../shared/BrandFooter";
import DualCommanderCards from "../shared/DualCommanderCards";

interface MonthlyChampionData {
  month: string;
  playerName: string;
  commanderName: string;
  commanderName_imageUrl?: string;
  commanderName_overrideUrl?: string;
  hasPartner?: boolean;
  partnerName?: string;
  partnerName_imageUrl?: string;
  partnerName_overrideUrl?: string;
  deckName?: string;
  gamesPlayed?: string;
  winRate?: string;
  quote?: string;
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function MonthlyChampion({ data }: { data: MonthlyChampionData }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);
  const commanderImageUrl =
    data.commanderName_overrideUrl || data.commanderName_imageUrl || null;
  const partnerImageUrl =
    data.hasPartner
      ? data.partnerName_overrideUrl || data.partnerName_imageUrl || null
      : null;

  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(160deg, #020a18 0%, #0a1a3a 30%, #0d2247 55%, #081430 80%, #030b1a 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONTS.cinzel,
      }}
    >
      {/* Blue mesh orb — top right */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30, 80, 180, 0.25) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Blue mesh orb — bottom left */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(20, 60, 160, 0.2) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Gold glow behind commander area */}
      <div
        style={{
          position: "absolute",
          top: "38%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(212, 160, 23, 0.18) 0%, transparent 65%)`,
          filter: "blur(30px)",
        }}
      />

      {/* Diagonal accent lines */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -100,
            width: 1,
            height: 700,
            background: "linear-gradient(180deg, transparent, rgba(100, 160, 255, 0.2), transparent)",
            transform: "rotate(35deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -100,
            width: 1,
            height: 700,
            background: "linear-gradient(180deg, transparent, rgba(100, 160, 255, 0.2), transparent)",
            transform: "rotate(-35deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 300,
            left: 100,
            width: 1,
            height: 500,
            background: `linear-gradient(180deg, transparent, ${BRAND.gold}, transparent)`,
            transform: "rotate(35deg)",
            opacity: 0.1,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 300,
            right: 100,
            width: 1,
            height: 500,
            background: `linear-gradient(180deg, transparent, ${BRAND.gold}, transparent)`,
            transform: "rotate(-35deg)",
            opacity: 0.1,
          }}
        />
      </div>

      {/* Smoke overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${ASSETS.backgroundSmoke})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.08,
          mixBlendMode: "soft-light",
        }}
      />

      {/* Top: ECL Logo + month */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "60px 40px 20px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 80, width: "auto", margin: "0 auto 16px", display: "block" }}
        />
        <p
          style={{
            fontSize: 22,
            color: "rgba(180, 200, 230, 0.8)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {monthLabel}
        </p>
      </div>

      {/* Center: Commander card + Champion name */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          padding: "0 60px",
        }}
      >
        {/* CHAMPION badge */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldDark})`,
            padding: "10px 48px",
            borderRadius: 4,
            boxShadow: "0 4px 24px rgba(212, 160, 23, 0.3)",
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#050d1a",
              letterSpacing: "0.25em",
            }}
          >
            CHAMPION
          </span>
        </div>

        {/* Commander card(s) */}
        {commanderImageUrl ? (
          <DualCommanderCards
            mainUrl={commanderImageUrl}
            partnerUrl={partnerImageUrl}
            mainName={data.commanderName}
            partnerName={data.partnerName}
            cardHeight={440}
            borderColor={BRAND.gold}
            glowColor={BRAND.goldGlow}
          />
        ) : (
          <div
            style={{
              width: 320,
              height: 440,
              borderRadius: 16,
              border: "2px dashed rgba(100, 160, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(180, 200, 230, 0.4)",
              fontSize: 18,
            }}
          >
            Commander Card
          </div>
        )}

        {/* Player name */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: BRAND.textWhite,
              margin: 0,
              letterSpacing: "0.05em",
              textShadow: "0 0 40px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            {data.playerName || "Player Name"}
          </h1>

          {data.commanderName && (
            <p
              style={{
                fontSize: 22,
                color: BRAND.goldLight,
                margin: "8px 0 0",
                letterSpacing: "0.05em",
              }}
            >
              {data.deckName ? `${data.deckName} — ` : ""}
              {data.commanderName}
              {data.hasPartner && data.partnerName ? ` / ${data.partnerName}` : ""}
            </p>
          )}
        </div>

        {/* Stats row */}
        {(data.gamesPlayed || data.winRate) && (
          <div style={{ display: "flex", gap: 48, justifyContent: "center" }}>
            {data.gamesPlayed && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 40, fontWeight: 900, color: BRAND.gold, margin: 0 }}>
                  {data.gamesPlayed}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(180, 200, 230, 0.5)",
                    margin: "2px 0 0",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  GAMES
                </p>
              </div>
            )}
            {data.winRate && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 40, fontWeight: 900, color: BRAND.gold, margin: 0 }}>
                  {data.winRate}%
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(180, 200, 230, 0.5)",
                    margin: "2px 0 0",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  OW%
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quote */}
        {data.quote && (
          <p
            style={{
              fontSize: 18,
              fontStyle: "italic",
              color: "rgba(180, 200, 230, 0.7)",
              margin: 0,
              textAlign: "center",
              maxWidth: 700,
              lineHeight: 1.5,
            }}
          >
            &ldquo;{data.quote}&rdquo;
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <BrandFooter width={width} />
      </div>
    </div>
  );
}
