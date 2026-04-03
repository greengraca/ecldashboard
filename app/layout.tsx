import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ECL Dashboard",
  description: "European cEDH League management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={{
        "--font-body": `${jakarta.style.fontFamily}, system-ui, -apple-system, sans-serif`,
        "--font-mono": `${jetbrains.style.fontFamily}, 'Fira Code', monospace`,
      } as React.CSSProperties}
    >
      <head>
        {process.env.NODE_ENV === "development" && (
          <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
        )}
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
