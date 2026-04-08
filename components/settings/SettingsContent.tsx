"use client";

import { useSession } from "next-auth/react";
import { Settings, User, Database, Shield, Globe, DollarSign, EyeOff } from "lucide-react";
import { useSensitiveData } from "@/contexts/SensitiveDataContext";
import TopDeckRefreshButton from "@/components/settings/topdeck-refresh-button";
import SyncDiscordButton from "@/components/settings/sync-discord-button";
import SyncPatreonButton from "@/components/settings/sync-patreon-button";
import SubscriptionRatesManager from "./SubscriptionRatesManager";
import TeamMemberManager from "./TeamMemberManager";
import MonthlyConfigManager from "./MonthlyConfigManager";

function mask(value: string, showChars = 4): string {
  if (!value) return "Not set";
  if (value.length <= showChars) return value;
  return value.slice(0, showChars) + "..." + value.slice(-2);
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-b-0"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {icon}
        <h2
          className="text-sm font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {title}
        </h2>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

export default function SettingsContent({
  maskedGuildId,
  dbName,
  version,
}: {
  maskedGuildId: string;
  dbName: string;
  version: string;
}) {
  const { data: session } = useSession();
  const { hidden, setHidden } = useSensitiveData();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;
  const discordId = user?.discordId || user?.id || "-";
  const username = user?.username || user?.name || "-";
  const avatarUrl = user?.image || null;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="p-2 rounded-lg"
            style={{ background: "var(--accent-light)" }}
          >
            <Settings className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Settings
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Dashboard configuration and account info
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="grid gap-6 content-start">
          {/* User Profile */}
          <Section
            icon={<User className="w-4 h-4" style={{ color: "var(--accent)" }} />}
            title="Your Profile"
          >
            <div className="flex items-center gap-4 py-3 mb-1">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    background: "var(--accent-light)",
                    color: "var(--accent)",
                  }}
                >
                  {(username as string).charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {hidden ? "••••" : username}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Discord ID: {hidden ? "••••••••••" : discordId}
                </p>
              </div>
            </div>
          </Section>

          {/* Privacy */}
          <Section
            icon={<EyeOff className="w-4 h-4" style={{ color: "var(--accent)" }} />}
            title="Privacy"
          >
            <div
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Hide sensitive data
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Mask financial amounts, names, and PII across the dashboard
                </p>
              </div>
              <button
                role="switch"
                aria-checked={hidden}
                onClick={() => setHidden(!hidden)}
                className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
                style={{
                  background: hidden ? "var(--accent)" : "var(--border)",
                }}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full transition-transform duration-200"
                  style={{
                    background: hidden ? "var(--accent-text, #fff)" : "var(--text-muted)",
                    transform: hidden ? "translateX(24px)" : "translateX(4px)",
                  }}
                />
              </button>
            </div>
          </Section>

          {/* Subscription Rates */}
          <Section
            icon={
              <DollarSign className="w-4 h-4" style={{ color: "var(--accent)" }} />
            }
            title="Subscription Rates"
          >
            <SubscriptionRatesManager />
          </Section>

          {/* Data & Caches */}
          <Section
            icon={
              <Globe className="w-4 h-4" style={{ color: "var(--accent)" }} />
            }
            title="Data & Caches"
          >
            <SyncDiscordButton />
            <SyncPatreonButton />
            <TopDeckRefreshButton />
          </Section>
        </div>

        {/* Right column */}
        <div className="grid gap-6 content-start">
          {/* Dashboard Info */}
          <Section
            icon={
              <Database
                className="w-4 h-4"
                style={{ color: "var(--accent)" }}
              />
            }
            title="Dashboard Info"
          >
            <InfoRow label="Version" value={version} />
            <InfoRow label="Framework" value="Next.js 16 (App Router)" />
            <InfoRow label="Database" value={dbName} />
            <InfoRow label="Auth Provider" value="Discord OAuth" />
          </Section>

          {/* Environment */}
          <Section
            icon={
              <Shield className="w-4 h-4" style={{ color: "var(--accent)" }} />
            }
            title="Environment"
          >
            <InfoRow
              label="Guild ID"
              value={
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {maskedGuildId}
                </span>
              }
            />
            <InfoRow
              label="Patreon Roles"
              value={
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--status-patreon-light)",
                    color: "var(--status-patreon)",
                  }}
                >
                  Configured
                </span>
              }
            />
            <InfoRow
              label="Ko-fi Roles"
              value={
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--status-kofi-light)",
                    color: "var(--status-kofi)",
                  }}
                >
                  Configured
                </span>
              }
            />
            <InfoRow
              label="Free Entry Roles"
              value={
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--status-free-light)",
                    color: "var(--status-free)",
                  }}
                >
                  Configured
                </span>
              }
            />
          </Section>
        </div>

        {/* League Monthly Config */}
        <div className="lg:col-span-2">
          <MonthlyConfigManager />
        </div>

        {/* Team Members */}
        <div className="mb-8">
          <TeamMemberManager />
        </div>
      </div>
    </div>
  );
}
