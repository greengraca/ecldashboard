import { BRAND, FONTS, DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";
import BrandFooter from "../shared/BrandFooter";
import type { DiscordMember } from "@/lib/types";

interface BracketData {
  top4_order: Array<{ uid: string; name: string }>;
}

interface FinalsAnnouncementData {
  month: string;
  streamDate?: string;
  streamTime?: string;
  brackets?: BracketData;
  members?: DiscordMember[];
  // Commander fields per player
  commander1?: string;
  commander1_imageUrl?: string;
  commander1_overrideUrl?: string;
  hasPartner1?: boolean;
  partner1?: string;
  partner1_imageUrl?: string;
  partner1_overrideUrl?: string;
  commander2?: string;
  commander2_imageUrl?: string;
  commander2_overrideUrl?: string;
  hasPartner2?: boolean;
  partner2?: string;
  partner2_imageUrl?: string;
  partner2_overrideUrl?: string;
  commander3?: string;
  commander3_imageUrl?: string;
  commander3_overrideUrl?: string;
  hasPartner3?: boolean;
  partner3?: string;
  partner3_imageUrl?: string;
  partner3_overrideUrl?: string;
  commander4?: string;
  commander4_imageUrl?: string;
  commander4_overrideUrl?: string;
  hasPartner4?: boolean;
  partner4?: string;
  partner4_imageUrl?: string;
  partner4_overrideUrl?: string;
  [key: string]: unknown;
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long" });
}

function formatStreamDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface FinalistCardProps {
  name: string;
  avatarUrl: string | null;
  commanderName: string;
  commanderImageUrl: string | null;
  partnerName?: string;
  partnerImageUrl?: string | null;
  seed: number;
}

function FinalistCard({
  name,
  avatarUrl,
  commanderName,
  commanderImageUrl,
  partnerName,
  partnerImageUrl,
  seed,
}: FinalistCardProps) {
  const hasPartner = !!partnerImageUrl;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        background: BRAND.bgCard,
        border: `1px solid ${BRAND.bgCardBorder}`,
        borderRadius: 16,
        padding: "24px 16px",
        width: 220,
      }}
    >
      {/* Seed number */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldDark})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 900,
          color: BRAND.bgDark,
          fontFamily: FONTS.cinzel,
        }}
      >
        {seed}
      </div>

      {/* Avatar */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          overflow: "hidden",
          border: `2px solid ${BRAND.gold}`,
          background: "rgba(255,255,255,0.05)",
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
              fontSize: 28,
              fontWeight: 700,
              color: BRAND.textMuted,
              fontFamily: FONTS.cinzel,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <p
        style={{
          fontFamily: FONTS.cinzel,
          fontSize: 18,
          fontWeight: 700,
          color: BRAND.textWhite,
          margin: 0,
          textAlign: "center",
        }}
      >
        {name}
      </p>

      {/* Commander card(s) */}
      {commanderImageUrl && !hasPartner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={commanderImageUrl}
          alt={commanderName}
          style={{
            height: 160,
            width: "auto",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        />
      )}
      {commanderImageUrl && hasPartner && (
        <div
          style={{
            position: "relative",
            height: 140,
            width: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={commanderImageUrl}
            alt={commanderName}
            style={{
              position: "absolute",
              height: 130,
              width: "auto",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              transform: "rotate(-8deg) translateX(-18%)",
              zIndex: 1,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={partnerImageUrl!}
            alt={partnerName || "Partner"}
            style={{
              position: "absolute",
              height: 130,
              width: "auto",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              transform: "rotate(8deg) translateX(18%)",
              zIndex: 2,
            }}
          />
        </div>
      )}

      {/* Commander name */}
      {commanderName && (
        <p
          style={{
            fontSize: 12,
            color: BRAND.goldLight,
            margin: 0,
            textAlign: "center",
            fontFamily: FONTS.cinzel,
          }}
        >
          {commanderName}
          {partnerName ? ` / ${partnerName}` : ""}
        </p>
      )}
    </div>
  );
}

export default function FinalsAnnouncement({ data }: { data: FinalsAnnouncementData }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);
  const top4 = data.brackets?.top4_order || [];
  const members = data.members || [];

  // Build finalist data
  const finalists = Array.from({ length: 4 }, (_, i) => {
    const player = top4[i];
    const name = player?.name || `Player ${i + 1}`;
    const commanderKey = `commander${i + 1}` as keyof FinalsAnnouncementData;
    const commanderName = (data[commanderKey] as string) || "";
    const commanderImageUrl =
      (data[`commander${i + 1}_overrideUrl`] as string) ||
      (data[`commander${i + 1}_imageUrl`] as string) ||
      null;

    let avatarUrl: string | null = null;
    if (members.length > 0) {
      const member = members.find(
        (m) => m.username === name || m.display_name === name
      );
      if (member?.avatar_url) {
        avatarUrl = `/api/media/proxy?url=${encodeURIComponent(member.avatar_url)}`;
      }
    }

    const hasPartner = !!(data[`hasPartner${i + 1}`]);
    const partnerName = hasPartner ? (data[`partner${i + 1}`] as string) || "" : "";
    const partnerImageUrl = hasPartner
      ? (data[`partner${i + 1}_overrideUrl`] as string) ||
        (data[`partner${i + 1}_imageUrl`] as string) ||
        null
      : null;

    return { name, avatarUrl, commanderName, commanderImageUrl, partnerName, partnerImageUrl, seed: i + 1 };
  });

  const streamDateFormatted = data.streamDate
    ? formatStreamDate(data.streamDate)
    : null;

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
            fontSize: 44,
            fontWeight: 900,
            color: BRAND.textWhite,
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          {monthLabel} Finals
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
          TOP 4
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

      {/* Finalists grid — 2x2 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: "0 40px",
        }}
      >
        {top4.length === 0 ? (
          <p style={{ fontSize: 22, color: BRAND.textMuted }}>
            No bracket data for this month
          </p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              {finalists.slice(0, 2).map((f) => (
                <FinalistCard key={f.seed} {...f} />
              ))}
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: BRAND.gold,
                letterSpacing: "0.1em",
              }}
            >
              VS
            </div>
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              {finalists.slice(2, 4).map((f) => (
                <FinalistCard key={f.seed} {...f} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Stream date callout */}
      {(streamDateFormatted || data.streamTime) && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            padding: "24px 40px",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, rgba(212, 160, 23, 0.15), rgba(212, 160, 23, 0.05))`,
              border: `1px solid ${BRAND.gold}`,
              borderRadius: 12,
              padding: "16px 32px",
              display: "inline-block",
            }}
          >
            <p
              style={{
                fontSize: 16,
                color: BRAND.textGray,
                margin: 0,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              LIVE ON
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: BRAND.gold,
                margin: "4px 0 0",
              }}
            >
              {streamDateFormatted}
              {data.streamTime ? ` at ${data.streamTime}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <BrandFooter width={width} />
      </div>
    </div>
  );
}
