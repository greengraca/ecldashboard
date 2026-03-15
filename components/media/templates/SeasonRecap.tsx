import { BRAND, FONTS, DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";
import BrandFooter from "../shared/BrandFooter";

interface SeasonRecapData {
  month: string;
  totalPlayers?: string;
  totalGames?: string;
  totalPrizeValue?: string;
  championName?: string;
  topCommander?: string;
  avgGamesPerPlayer?: string;
  customStat1Label?: string;
  customStat1Value?: string;
  customStat2Label?: string;
  customStat2Value?: string;
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface StatBlockProps {
  value: string;
  label: string;
}

function StatBlock({ value, label }: StatBlockProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "16px 12px",
        flex: 1,
      }}
    >
      <p
        style={{
          fontSize: 40,
          fontWeight: 900,
          color: BRAND.gold,
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: 12,
          color: "rgba(130, 170, 220, 0.6)",
          margin: "8px 0 0",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
    </div>
  );
}

export default function SeasonRecap({ data }: { data: SeasonRecapData }) {
  const { width, height } = DIMENSIONS.feed;
  const monthLabel = getMonthLabel(data.month);

  const stats: { value: string; label: string }[] = [];
  if (data.totalPlayers) stats.push({ value: data.totalPlayers, label: "Players" });
  if (data.totalGames) stats.push({ value: data.totalGames, label: "Games Played" });
  if (data.avgGamesPerPlayer) stats.push({ value: data.avgGamesPerPlayer, label: "Avg Games/Player" });
  if (data.totalPrizeValue) stats.push({ value: `€${data.totalPrizeValue}`, label: "Prize Pool" });
  if (data.customStat1Label && data.customStat1Value)
    stats.push({ value: data.customStat1Value, label: data.customStat1Label });
  if (data.customStat2Label && data.customStat2Value)
    stats.push({ value: data.customStat2Value, label: data.customStat2Label });

  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(145deg, #020a18 0%, #0a1e44 30%, #0e2850 55%, #081a38 80%, #030c1c 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONTS.cinzel,
      }}
    >
      {/* Blue orb — center-left */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: -80,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30, 80, 180, 0.18) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Blue orb — top-right */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -40,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(40, 90, 200, 0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Corner accent — top-left triangle */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          borderLeft: "180px solid rgba(40, 100, 200, 0.06)",
          borderBottom: "180px solid transparent",
        }}
      />

      {/* Corner accent — bottom-right triangle */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
          borderRight: "180px solid rgba(40, 100, 200, 0.06)",
          borderTop: "180px solid transparent",
        }}
      />

      {/* Subtle horizontal dividers */}
      <div
        style={{
          position: "absolute",
          top: "33%",
          left: 60,
          right: 60,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(100, 160, 255, 0.1), transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "66%",
          left: 60,
          right: 60,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(100, 160, 255, 0.1), transparent)",
        }}
      />

      {/* Smoke overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${ASSETS.backgroundSmoke})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.05,
          mixBlendMode: "soft-light",
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "40px 40px 16px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 70, width: "auto", margin: "0 auto 12px", display: "block" }}
        />
        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: BRAND.textWhite,
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          {monthLabel}
        </h1>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: BRAND.gold,
            margin: "6px 0 0",
            letterSpacing: "0.2em",
          }}
        >
          SEASON RECAP
        </h2>
        <div
          style={{
            width: 300,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${BRAND.gold}, transparent)`,
            margin: "16px auto 0",
          }}
        />
      </div>

      {/* Stats grid */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 60px",
          gap: 16,
        }}
      >
        {/* Champion highlight row */}
        {data.championName && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              background: "linear-gradient(135deg, rgba(212, 160, 23, 0.1), rgba(20, 60, 140, 0.08))",
              border: "1px solid rgba(212, 160, 23, 0.2)",
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: "rgba(130, 170, 220, 0.6)",
                margin: 0,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              CHAMPION
            </p>
            <p
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: BRAND.gold,
                margin: "4px 0 0",
              }}
            >
              {data.championName}
            </p>
            {data.topCommander && (
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(200, 215, 240, 0.7)",
                  margin: "4px 0 0",
                }}
              >
                {data.topCommander}
              </p>
            )}
          </div>
        )}

        {/* Stats rows — 2 per row */}
        {stats.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {stats.map((stat, i) => (
              <div
                key={stat.label + i}
                style={{
                  flex: "1 1 calc(50% - 6px)",
                  minWidth: "calc(50% - 6px)",
                  background: "rgba(10, 30, 70, 0.4)",
                  border: "1px solid rgba(100, 160, 255, 0.08)",
                  borderRadius: 10,
                  backdropFilter: "blur(4px)",
                }}
              >
                <StatBlock value={stat.value} label={stat.label} />
              </div>
            ))}
          </div>
        )}

        {stats.length === 0 && !data.championName && (
          <p
            style={{
              textAlign: "center",
              fontSize: 20,
              color: "rgba(130, 170, 220, 0.4)",
            }}
          >
            Fill in stats to preview
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
