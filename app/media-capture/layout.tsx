import Script from "next/script";

export default function CaptureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#0a0a14", minHeight: "100vh" }}>
      <Script
        src="https://mcp.figma.com/mcp/html-to-design/capture.js"
        strategy="afterInteractive"
      />
      {children}
    </div>
  );
}
