import { getDb } from "./mongodb";
import {
  PATREON_CREATOR_TOKEN,
  PATREON_CLIENT_ID,
  PATREON_CLIENT_SECRET,
  PATREON_REFRESH_TOKEN,
} from "./constants";

const COLLECTION = "dashboard_secrets";
const TOKEN_KEY = "patreon_oauth";

interface StoredToken {
  key: string;
  access_token: string;
  refresh_token: string;
  updated_at: string;
}

/**
 * Get current access token — checks DB first, falls back to env var.
 */
export async function getAccessToken(): Promise<string> {
  const stored = await getStoredToken();
  if (stored?.access_token) return stored.access_token;
  return PATREON_CREATOR_TOKEN;
}

/**
 * Refresh the access token using Patreon's OAuth2 endpoint.
 * Stores the new access + refresh tokens in MongoDB.
 * Returns the new access token.
 */
export async function refreshAccessToken(): Promise<string> {
  const currentRefresh = await getCurrentRefreshToken();
  if (!currentRefresh || !PATREON_CLIENT_ID || !PATREON_CLIENT_SECRET) {
    throw new Error(
      "Cannot refresh Patreon token: PATREON_CLIENT_ID, PATREON_CLIENT_SECRET, and PATREON_REFRESH_TOKEN are required"
    );
  }

  const res = await fetch("https://www.patreon.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRefresh,
      client_id: PATREON_CLIENT_ID,
      client_secret: PATREON_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Patreon token refresh failed (${res.status}): ${text}. ` +
        "The refresh token may be expired — ask the Patreon controller to regenerate credentials."
    );
  }

  const data = await res.json();
  const { access_token, refresh_token } = data;

  const db = await getDb();
  await db.collection<StoredToken>(COLLECTION).updateOne(
    { key: TOKEN_KEY },
    {
      $set: {
        key: TOKEN_KEY,
        access_token,
        refresh_token,
        updated_at: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  return access_token;
}

async function getStoredToken(): Promise<StoredToken | null> {
  const db = await getDb();
  return db.collection<StoredToken>(COLLECTION).findOne({ key: TOKEN_KEY });
}

async function getCurrentRefreshToken(): Promise<string> {
  const stored = await getStoredToken();
  return stored?.refresh_token || PATREON_REFRESH_TOKEN;
}
