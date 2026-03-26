import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { logApiError } from "@/lib/error-log";

export const GET = withAuthRead(async (request) => {
  const token = process.env.HEROKU_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Heroku API token not configured" },
      { status: 501 }
    );
  }

  const { searchParams } = new URL(request.url);
  const lines = Math.min(
    Math.max(parseInt(searchParams.get("lines") || "100", 10) || 100, 1),
    1500
  );

  // Create a log session
  const sessionRes = await fetch(
    "https://api.heroku.com/apps/eclbot/log-sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.heroku+json; version=3",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lines, tail: false }),
    }
  );

  if (!sessionRes.ok) {
    const text = await sessionRes.text();
    logApiError("heroku-logs:GET", new Error(`Heroku API ${sessionRes.status}: ${text}`));
    return NextResponse.json(
      { error: `Heroku API error: ${sessionRes.status}` },
      { status: 502 }
    );
  }

  const { logplex_url } = await sessionRes.json();

  // Fetch logs from the logplex URL with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const logRes = await fetch(logplex_url, { signal: controller.signal });
    const logText = await logRes.text();

    return NextResponse.json({
      data: {
        lines: logText,
        fetchedAt: new Date().toISOString(),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}, "heroku-logs:GET");
