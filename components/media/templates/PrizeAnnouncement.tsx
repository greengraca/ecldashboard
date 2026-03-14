import { BRAND, FONTS, DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";
import BrandFooter from "../shared/BrandFooter";
import type { Prize } from "@/lib/types";

interface PrizeAnnouncementData {
  month: string;
  title?: string;
  prizes?: Prize[];
  // Card image URLs keyed by prize index: card_0_imageUrl, card_1_imageUrl, etc.
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
    case 1: return "1ST PLACE";
    case 2: return "2ND PLACE";
    case 3: return "3RD PLACE";
    case 4: return "4TH PLACE";
    default: return `${n}TH PLACE`;
  }
}

interface PrizeSectionProps {
  label: string;
  prizes: Prize[];
  data: PrizeAnnouncementData;
  startIndex: number;
  highlight?: boolean;
}

function PrizeSection({ label, prizes, data, startIndex, highlight }: PrizeSectionProps) {
  return (
    <div
      style={{
        padding: "20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h3
        style={{
          fontFamily: FONTS.cinzel,
          fontSize: highlight ? 36 : 28,
          fontWeight: highlight ? 900 : 700,
          color: highlight ? BRAND.gold : BRAND.goldLight,
          margin: 0,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </h3>

      {prizes.map((prize, i) => {
        const cardImageUrl =
          (data[`card_${startIndex + i}_imageUrl`] as string) ||
          (data[`card_${startIndex + i}_overrideUrl`] as string) ||
          null;

        return (
          <div
            key={String(prize._id) || i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              background: BRAND.bgCard,
              border: `1px solid ${BRAND.bgCardBorder}`,
              borderRadius: 12,
              padding: "12px 20px",
            }}
          >
            {cardImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cardImageUrl}
                alt={prize.name}
                style={{
                  height: 100,
                  width: "auto",
                  borderRadius: 6,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: FONTS.cinzel,
                  fontSize: 22,
                  fontWeight: 700,
                  color: BRAND.textWhite,
                  margin: 0,
                }}
              >
                {prize.name}
              </p>
              {prize.description && (
                <p
                  style={{
                    fontSize: 16,
                    color: BRAND.textGray,
                    margin: "4px 0 0",
                    fontFamily: FONTS.cinzel,
                  }}
                >
                  {prize.description}
                </p>
              )}
            </div>
            {prize.value > 0 && (
              <p
                style={{
                  fontFamily: FONTS.cinzel,
                  fontSize: 20,
                  fontWeight: 700,
                  color: BRAND.gold,
                  margin: 0,
                }}
              >
                €{prize.value}
              </p>
            )}
          </div>
        );
      })}

      {/* Special items for 1st place */}
      {highlight && (
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.championRing}
            alt="Champion Ring"
            onError={onAssetError}
            style={{ height: 80, width: "auto", objectFit: "contain" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.championshipTicket}
            alt="Championship Ticket"
            onError={onAssetError}
            style={{ height: 80, width: "auto", objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
}

export default function PrizeAnnouncement({ data }: { data: PrizeAnnouncementData }) {
  const { width, height } = DIMENSIONS.story;
  const prizes: Prize[] = data.prizes || [];
  const monthLabel = getMonthLabel(data.month);
  const title = data.title || `ECL ${monthLabel} League`;

  // Group prizes
  const firstPlace = prizes.filter((p) => p.recipient_type === "placement" && p.placement === 1);
  const otherPlacements = prizes.filter(
    (p) => p.recipient_type === "placement" && p.placement && p.placement > 1
  );
  const mostGames = prizes.filter((p) => p.recipient_type === "most_games");
  const treasurePod = prizes.filter((p) => p.recipient_type === "treasure_pod");
  const top16Prizes = prizes.filter((p) => p.recipient_type === "top16");
  const customPrizes = prizes.filter((p) => p.recipient_type === "custom");

  let prizeIndex = 0;
  const sections: { label: string; prizes: Prize[]; highlight?: boolean }[] = [];

  if (firstPlace.length > 0) {
    sections.push({ label: getPlacementLabel(1), prizes: firstPlace, highlight: true });
  }
  if (otherPlacements.length > 0) {
    sections.push({ label: "2ND - 4TH PLACE", prizes: otherPlacements });
  }
  if (mostGames.length > 0) {
    sections.push({ label: "MOST GAMES", prizes: mostGames });
  }
  if (treasurePod.length > 0) {
    sections.push({ label: "TREASURE POD", prizes: treasurePod });
  }
  if (top16Prizes.length > 0) {
    sections.push({ label: "TOP 16", prizes: top16Prizes });
  }
  if (customPrizes.length > 0) {
    sections.push({ label: "SPECIAL PRIZES", prizes: customPrizes });
  }

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
          padding: "60px 40px 30px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 100, width: "auto", margin: "0 auto 20px", display: "block" }}
        />
        <h1
          style={{
            fontSize: 44,
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
            fontSize: 32,
            fontWeight: 700,
            color: BRAND.gold,
            margin: "8px 0 0",
            letterSpacing: "0.15em",
          }}
        >
          PRIZING
        </h2>
        <div
          style={{
            width: 600,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${BRAND.gold}, transparent)`,
            margin: "20px auto 0",
          }}
        />
      </div>

      {/* Prize sections */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          overflowY: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {sections.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p style={{ fontSize: 24, color: BRAND.textMuted }}>No prizes added yet</p>
          </div>
        ) : (
          sections.map((section) => {
            const startIdx = prizeIndex;
            prizeIndex += section.prizes.length;
            return (
              <PrizeSection
                key={section.label}
                label={section.label}
                prizes={section.prizes}
                data={data}
                startIndex={startIdx}
                highlight={section.highlight}
              />
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <BrandFooter width={width} />
      </div>
    </div>
  );
}
