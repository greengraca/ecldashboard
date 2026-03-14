import { BRAND, FONTS, DIMENSIONS, ASSETS, onAssetError } from "../shared/brand-constants";
import BrandFooter from "../shared/BrandFooter";

interface StreamLiveData {
  streamUrl: string;
  month: string;
}

export default function StreamLive({ data }: { data: StreamLiveData }) {
  const { width, height } = DIMENSIONS.story;

  const monthLabel = (() => {
    if (!data.month) return "";
    const [y, m] = data.month.split("-").map(Number);
    const date = new Date(y, m - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();

  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(180deg, ${BRAND.bgDark} 0%, #0d0d1a 50%, ${BRAND.bgDark} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONTS.cinzel,
      }}
    >
      {/* Background smoke overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${ASSETS.backgroundSmoke})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.3,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 48,
          padding: "0 80px",
          textAlign: "center",
        }}
      >
        {/* ECL Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: 160, width: "auto", objectFit: "contain" }}
        />

        {/* Month */}
        <p
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: BRAND.textGray,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {monthLabel}
        </p>

        {/* LIVE NOW */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 20px rgba(239, 68, 68, 0.6)",
              }}
            />
            <h1
              style={{
                fontSize: 96,
                fontWeight: 900,
                color: BRAND.textWhite,
                margin: 0,
                letterSpacing: "0.05em",
                textShadow: "0 0 40px rgba(255, 255, 255, 0.2)",
              }}
            >
              LIVE NOW
            </h1>
          </div>

          {/* Gold separator */}
          <div
            style={{
              width: 400,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${BRAND.gold}, transparent)`,
            }}
          />
        </div>

        {/* Stream URL */}
        {data.streamUrl && (
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: BRAND.gold,
              margin: 0,
              wordBreak: "break-all",
            }}
          >
            {data.streamUrl}
          </p>
        )}

        {/* cEDH Championship logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.cedhChampionshipLogo}
          alt="cEDH European Championship"
          onError={onAssetError}
          style={{ height: 100, width: "auto", objectFit: "contain", opacity: 0.8 }}
        />
      </div>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <BrandFooter width={width} />
      </div>
    </div>
  );
}
