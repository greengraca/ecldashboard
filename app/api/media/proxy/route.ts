import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";

const ALLOWED_HOSTS = [
  "cards.scryfall.io",
  "c1.scryfall.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "topdeck.gg",
];

export const GET = withAuthRead(async (req: NextRequest) => {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "ECL-Dashboard/1.0" },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: res.status });
  }

  const MAX_PROXY_SIZE = 10 * 1024 * 1024; // 10 MB
  const cl = parseInt(res.headers.get("content-length") || "0", 10);
  if (cl > MAX_PROXY_SIZE) {
    return NextResponse.json({ error: "Response too large" }, { status: 413 });
  }

  const contentType = res.headers.get("content-type") || "image/png";
  const buffer = await res.arrayBuffer();

  if (buffer.byteLength > MAX_PROXY_SIZE) {
    return NextResponse.json({ error: "Response too large" }, { status: 413 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": process.env.NEXTAUTH_URL || "",
    },
  });
}, "media/proxy:GET");
