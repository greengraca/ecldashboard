import { BRAND, FONTS, DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";
import BrandFooter from "../shared/BrandFooter";
import type { DiscordMember } from "@/lib/types";

interface BracketData {
  top16_winners: string[];
  top4_order: Array<{ uid: string; name: string }>;
}

interface SemiFinalWinnerData {
  month: string;
  pod: string; // "1"-"4"
  commanderName: string;
  commanderName_imageUrl?: string;
  commanderName_overrideUrl?: string;
  deckName?: string;
  brackets?: BracketData;
  members?: DiscordMember[];
  // Pod player data (auto-filled based on pod selection)
  podPlayers?: Array<{
    uid: string;
    name: string;
    avatarUrl: string | null;
    placement: number;
    isWinner: boolean;
  }>;
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long" });
}

// Snake-draft pod seeding for Top 16 (4 pods of 4)
const POD_INDICES: number[][] = [
  [0, 7, 8, 15],   // Pod 1
  [1, 6, 9, 14],   // Pod 2
  [2, 5, 10, 13],  // Pod 3
  [3, 4, 11, 12],  // Pod 4
];

function getPodPlayers(
  brackets: BracketData | undefined,
  podNum: number,
  members: DiscordMember[] | undefined,
) {
  if (!brackets?.top16_winners || podNum < 1 || podNum > 4) return [];

  const indices = POD_INDICES[podNum - 1];
  const winners = brackets.top16_winners;

  return indices.map((idx, placement) => {
    const uid = winners[idx];
    const name = uid || `Player ${idx + 1}`;

    // Try to find matching Discord member for avatar
    let avatarUrl: string | null = null;
    if (members) {
      const member = members.find(
        (m) => m.username === name || m.display_name === name
      );
      if (member?.avatar_url) {
        avatarUrl = `/api/media/proxy?url=${encodeURIComponent(member.avatar_url)}`;
      }
    }

    return {
      uid: uid || "",
      name,
      avatarUrl,
      placement: placement + 1,
      isWinner: placement === 0,
    };
  });
}

function PlayerCard({
  name,
  avatarUrl,
  placement,
  isWinner,
}: {
  name: string;
  avatarUrl: string | null;
  placement: number;
  isWinner: boolean;
}) {
  const placementLabels = ["1st", "2nd", "3rd", "4th"];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "16px 24px",
        background: isWinner
          ? `linear-gradient(135deg, rgba(212, 160, 23, 0.15), rgba(212, 160, 23, 0.05))`
          : BRAND.bgCard,
        border: `2px solid ${isWinner ? BRAND.gold : BRAND.bgCardBorder}`,
        borderRadius: 12,
        boxShadow: isWinner ? `0 0 30px ${BRAND.goldGlow}` : "none",
      }}
    >
      {/* Placement */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: isWinner
            ? `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldDark})`
            : "rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONTS.cinzel,
          fontSize: 18,
          fontWeight: 900,
          color: isWinner ? BRAND.bgDark : BRAND.textMuted,
          flexShrink: 0,
        }}
      >
        {placement}
      </div>

      {/* Avatar */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          overflow: "hidden",
          border: `2px solid ${isWinner ? BRAND.gold : BRAND.bgCardBorder}`,
          background: "rgba(255,255,255,0.05)",
          flexShrink: 0,
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              color: BRAND.textMuted,
              fontFamily: FONTS.cinzel,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + placement label */}
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontFamily: FONTS.cinzel,
            fontSize: isWinner ? 28 : 22,
            fontWeight: isWinner ? 900 : 700,
            color: isWinner ? BRAND.gold : BRAND.textWhite,
            margin: 0,
          }}
        >
          {name}
        </p>
        <p
          style={{
            fontSize: 14,
            color: isWinner ? BRAND.goldLight : BRAND.textMuted,
            margin: "2px 0 0",
            fontFamily: FONTS.cinzel,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {placementLabels[placement - 1]} Place
        </p>
      </div>
    </div>
  );
}

export default function SemiFinalWinner({ data }: { data: SemiFinalWinnerData }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);
  const podNum = parseInt(data.pod || "1", 10);

  const podPlayers =
    data.podPlayers ||
    getPodPlayers(data.brackets, podNum, data.members);

  const commanderImageUrl =
    data.commanderName_overrideUrl || data.commanderName_imageUrl || null;

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
          padding: "60px 40px 24px",
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
            fontSize: 40,
            fontWeight: 900,
            color: BRAND.textWhite,
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          {monthLabel} Semi-Finals
        </h1>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: BRAND.gold,
            margin: "8px 0 0",
            letterSpacing: "0.15em",
          }}
        >
          POD {podNum}
        </h2>
        <div
          style={{
            width: 500,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${BRAND.gold}, transparent)`,
            margin: "20px auto 0",
          }}
        />
      </div>

      {/* Players */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "24px 60px",
        }}
      >
        {podPlayers.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p style={{ fontSize: 22, color: BRAND.textMuted }}>
              No bracket data for this month
            </p>
          </div>
        ) : (
          podPlayers.map((player, i) => (
            <PlayerCard
              key={player.uid || i}
              name={player.name}
              avatarUrl={player.avatarUrl}
              placement={player.placement}
              isWinner={player.isWinner}
            />
          ))
        )}

        {/* Commander card for winner */}
        {commanderImageUrl && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            {data.deckName && (
              <p
                style={{
                  fontSize: 18,
                  color: BRAND.textGray,
                  margin: "0 0 12px",
                  letterSpacing: "0.05em",
                }}
              >
                {data.deckName}
              </p>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={commanderImageUrl}
              alt={data.commanderName || "Commander"}
              style={{
                height: 300,
                width: "auto",
                borderRadius: 12,
                margin: "0 auto",
                display: "block",
                boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${BRAND.goldGlow}`,
              }}
            />
            <p
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: BRAND.gold,
                margin: "12px 0 0",
              }}
            >
              {data.commanderName}
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
