import { BRAND, FONTS, DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";
import BrandFooter from "../shared/BrandFooter";
import type { Prize } from "@/lib/types";

interface PrizePoolOverviewData {
  month: string;
  title?: string;
  prizes?: Prize[];
  [key: string]: unknown;
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long" });
}

function getPlacementLabel(n: number): string {
  switch (n) {
    case 1: return "1st";
    case 2: return "2nd";
    case 3: return "3rd";
    case 4: return "4th";
    default: return `${n}th`;
  }
}

interface CategorySummary {
  label: string;
  count: number;
  totalValue: number;
  names: string[];
}

export default function PrizePoolOverview({ data }: { data: PrizePoolOverviewData }) {
  const { width, height } = DIMENSIONS.feed;
  const prizes: Prize[] = data.prizes || [];
  const monthLabel = getMonthLabel(data.month);
  const title = data.title || `ECL ${monthLabel} League`;

  // Group prizes into categories
  const categories: CategorySummary[] = [];

  const placements = prizes.filter((p) => p.recipient_type === "placement");
  if (placements.length > 0) {
    for (const p of placements.sort((a, b) => (a.placement || 0) - (b.placement || 0))) {
      categories.push({
        label: `${getPlacementLabel(p.placement || 0)} Place`,
        count: 1,
        totalValue: p.value,
        names: [p.name],
      });
    }
  }

  const mostGames = prizes.filter((p) => p.recipient_type === "most_games");
  if (mostGames.length > 0) {
    categories.push({
      label: "Most Games",
      count: mostGames.length,
      totalValue: mostGames.reduce((s, p) => s + p.value, 0),
      names: mostGames.map((p) => p.name),
    });
  }

  const treasurePod = prizes.filter((p) => p.recipient_type === "treasure_pod");
  if (treasurePod.length > 0) {
    categories.push({
      label: "Treasure Pod",
      count: treasurePod.length,
      totalValue: treasurePod.reduce((s, p) => s + p.value, 0),
      names: treasurePod.map((p) => p.name),
    });
  }

  const top16 = prizes.filter((p) => p.recipient_type === "top16");
  if (top16.length > 0) {
    categories.push({
      label: "Top 16",
      count: top16.length,
      totalValue: top16.reduce((s, p) => s + p.value, 0),
      names: top16.map((p) => p.name),
    });
  }

  const custom = prizes.filter((p) => p.recipient_type === "custom");
  if (custom.length > 0) {
    categories.push({
      label: "Special",
      count: custom.length,
      totalValue: custom.reduce((s, p) => s + p.value, 0),
      names: custom.map((p) => p.name),
    });
  }

  const totalValue = prizes.reduce((s, p) => s + p.value, 0);

  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(180deg, ${BRAND.bgDark} 0%, #0d0d1a 50%, ${BRAND.bgDark} 100%)`,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONTS.cinzel,
      }}
    >
      {/* Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${ASSETS.backgroundSmoke})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.2,
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "40px 40px 20px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 80, width: "auto", margin: "0 auto 16px", display: "block" }}
        />
        <h1
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: BRAND.textWhite,
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </h1>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: BRAND.gold,
            margin: "8px 0 0",
            letterSpacing: "0.15em",
          }}
        >
          PRIZE POOL
        </h2>
        <div
          style={{
            width: 400,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${BRAND.gold}, transparent)`,
            margin: "16px auto 0",
          }}
        />
      </div>

      {/* Prize grid */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          padding: "16px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {categories.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p style={{ fontSize: 20, color: BRAND.textMuted }}>No prizes added yet</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.label}
              style={{
                display: "flex",
                alignItems: "center",
                background: BRAND.bgCard,
                border: `1px solid ${BRAND.bgCardBorder}`,
                borderRadius: 10,
                padding: "14px 20px",
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: BRAND.gold,
                    margin: 0,
                  }}
                >
                  {cat.label}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: BRAND.textGray,
                    margin: "2px 0 0",
                  }}
                >
                  {cat.names.join(", ")}
                </p>
              </div>
              {cat.totalValue > 0 && (
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: BRAND.textWhite,
                    margin: 0,
                  }}
                >
                  €{cat.totalValue}
                </p>
              )}
            </div>
          ))
        )}

        {/* Total */}
        {totalValue > 0 && (
          <div
            style={{
              textAlign: "center",
              marginTop: "auto",
              padding: "16px 0",
            }}
          >
            <div
              style={{
                width: 400,
                height: 1,
                background: BRAND.separator,
                margin: "0 auto 16px",
              }}
            />
            <p
              style={{
                fontSize: 18,
                color: BRAND.textGray,
                margin: 0,
              }}
            >
              TOTAL PRIZE POOL
            </p>
            <p
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: BRAND.gold,
                margin: "4px 0 0",
              }}
            >
              €{totalValue}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <BrandFooter width={width} />
      </div>
    </div>
  );
}
