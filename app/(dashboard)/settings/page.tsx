import { DISCORD_GUILD_ID } from "@/lib/constants";
import SettingsContent from "@/components/settings/SettingsContent";

function mask(value: string, showChars = 4): string {
  if (!value) return "Not set";
  if (value.length <= showChars) return value;
  return value.slice(0, showChars) + "..." + value.slice(-2);
}

export default function SettingsPage() {
  const maskedGuildId = mask(DISCORD_GUILD_ID, 6);
  const dbName = process.env.MONGODB_DB_NAME || "eclbot";

  const version = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";

  return <SettingsContent maskedGuildId={maskedGuildId} dbName={dbName} version={version} />;
}
