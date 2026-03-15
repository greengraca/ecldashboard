import { BRAND, FONTS, DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";
import BrandFooter from "../shared/BrandFooter";

interface RegistrationOpenData {
  month: string;
  registrationUrl?: string;
  deadline?: string;
  spotsLeft?: string;
  tagline?: string;
}

function getMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDeadline(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function RegistrationOpen({ data }: { data: RegistrationOpenData }) {
  const { width, height } = DIMENSIONS.story;
  const monthLabel = getMonthLabel(data.month);
  const deadlineFormatted = data.deadline ? formatDeadline(data.deadline) : null;

  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(165deg, #020a1a 0%, #0b1f45 25%, #102d5a 45%, #0a2248 65%, #051535 85%, #020a18 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONTS.cinzel,
      }}
    >
      {/* Large blue orb — center */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30, 80, 200, 0.15) 0%, transparent 65%)",
          filter: "blur(50px)",
        }}
      />

      {/* Small accent orb — top-left */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: -40,
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(60, 120, 220, 0.12) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* Gold border frame */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          right: 32,
          bottom: 32,
          border: "1px solid rgba(212, 160, 23, 0.1)",
          borderRadius: 8,
          pointerEvents: "none",
        }}
      />
      {/* Inner frame */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          right: 40,
          bottom: 40,
          border: "1px solid rgba(100, 160, 255, 0.05)",
          borderRadius: 4,
          pointerEvents: "none",
        }}
      />

      {/* Corner ornaments */}
      {[
        { top: 24, left: 24 },
        { top: 24, right: 24 },
        { bottom: 24, left: 24 },
        { bottom: 24, right: 24 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: 32,
            height: 32,
            borderTop: i < 2 ? `2px solid ${BRAND.gold}` : "none",
            borderBottom: i >= 2 ? `2px solid ${BRAND.gold}` : "none",
            borderLeft: i % 2 === 0 ? `2px solid ${BRAND.gold}` : "none",
            borderRight: i % 2 === 1 ? `2px solid ${BRAND.gold}` : "none",
            opacity: 0.4,
          }}
        />
      ))}

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

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          padding: "80px 80px",
          textAlign: "center",
        }}
      >
        {/* ECL Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 140, width: "auto", objectFit: "contain" }}
        />

        {/* Month */}
        <p
          style={{
            fontSize: 24,
            color: "rgba(180, 200, 230, 0.7)",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {monthLabel}
        </p>

        {/* REGISTRATION OPEN */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 500,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${BRAND.gold}, transparent)`,
            }}
          />
          <h1
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: BRAND.textWhite,
              margin: 0,
              letterSpacing: "0.08em",
              lineHeight: 1.1,
              textShadow: "0 0 60px rgba(60, 130, 255, 0.15), 0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            REGISTRATION
          </h1>
          <div
            style={{
              background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldDark})`,
              padding: "12px 64px",
              borderRadius: 4,
              boxShadow: "0 4px 32px rgba(212, 160, 23, 0.25)",
            }}
          >
            <span
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: "#050d1a",
                letterSpacing: "0.2em",
              }}
            >
              OPEN
            </span>
          </div>
          <div
            style={{
              width: 500,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${BRAND.gold}, transparent)`,
            }}
          />
        </div>

        {/* Tagline */}
        {data.tagline && (
          <p
            style={{
              fontSize: 24,
              color: "rgba(200, 215, 240, 0.7)",
              margin: 0,
              maxWidth: 700,
              lineHeight: 1.5,
            }}
          >
            {data.tagline}
          </p>
        )}

        {/* Spots left badge */}
        {data.spotsLeft && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: 8,
              padding: "12px 32px",
              boxShadow: "0 4px 20px rgba(239, 68, 68, 0.1)",
            }}
          >
            <p
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#fca5a5",
                margin: 0,
                letterSpacing: "0.05em",
              }}
            >
              {data.spotsLeft} SPOTS LEFT
            </p>
          </div>
        )}

        {/* Deadline */}
        {deadlineFormatted && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <p
              style={{
                fontSize: 14,
                color: "rgba(130, 170, 220, 0.5)",
                margin: 0,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              REGISTRATION CLOSES
            </p>
            <p
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: BRAND.gold,
                margin: 0,
              }}
            >
              {deadlineFormatted}
            </p>
          </div>
        )}

        {/* Registration URL */}
        {data.registrationUrl && (
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: BRAND.goldLight,
              margin: 0,
              wordBreak: "break-all",
            }}
          >
            {data.registrationUrl}
          </p>
        )}

        {/* Championship logos */}
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.commanderArenaLogo}
            alt="Commander Arena"
            onError={onAssetError}
            style={{ height: 60, width: "auto", objectFit: "contain", opacity: 0.6 }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.cedhChampionshipLogo}
            alt="cEDH Championship"
            onError={onAssetError}
            style={{ height: 60, width: "auto", objectFit: "contain", opacity: 0.6 }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <BrandFooter width={width} />
      </div>
    </div>
  );
}
