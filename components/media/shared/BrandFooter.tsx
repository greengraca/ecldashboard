import { BRAND, FONTS, ASSETS, onAssetError } from "./brand-constants";

interface BrandFooterProps {
  width: number;
}

export default function BrandFooter({ width }: BrandFooterProps) {
  const scale = width / 1080;
  const logoSize = 60 * scale;
  const gap = 24 * scale;
  const fontSize = 14 * scale;
  const py = 32 * scale;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: gap,
        padding: `${py}px 0`,
        borderTop: `1px solid ${BRAND.separator}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: gap * 1.5,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.eclLogo}
          alt="ECL"
          onError={onAssetError}
          style={{ height: logoSize, width: "auto", objectFit: "contain" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.commanderArenaLogo}
          alt="Commander Arena"
          onError={onAssetError}
          style={{ height: logoSize, width: "auto", objectFit: "contain" }}
        />
      </div>
      <p
        style={{
          fontFamily: FONTS.cinzel,
          fontSize: fontSize,
          color: BRAND.textMuted,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        European cEDH League
      </p>
    </div>
  );
}
