"use client";

import useSWR from "swr";
import StatCard from "@/components/dashboard/stat-card";
import FinanceOverview from "@/components/finance/finance-overview";
import { Users, Wallet, Swords, Activity } from "lucide-react";
import type { ActivityEntry, ActivityAction } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

const actionColors: Record<ActivityAction, string> = {
  create: "var(--success)",
  update: "var(--status-active)",
  delete: "var(--error)",
  sync: "var(--warning)",
};

function StatSkeleton() {
  return (
    <div
      className="h-full p-5 rounded-xl border"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton w-8 h-8 rounded-lg" />
      </div>
      <div className="skeleton h-7 w-20 rounded mb-1" />
      <div className="skeleton h-3 w-16 rounded mt-1" />
    </div>
  );
}

export default function HomePage() {
  const month = getCurrentMonth();

  const { data: subData, isLoading: subLoading } = useSWR(
    `/api/subscribers?month=${month}`,
    fetcher
  );

  const { data: financeData, isLoading: finLoading } = useSWR(
    `/api/finance/summary?month=${month}`,
    fetcher
  );

  const { data: playerData, isLoading: playerLoading } = useSWR(
    "/api/players/standings/live",
    fetcher
  );

  const { data: activityData, isLoading: actLoading } = useSWR(
    `/api/activity?limit=5`,
    fetcher
  );

  const summary = subData?.data?.summary;
  const finance = financeData?.data;
  const liveStandings = playerData?.data?.standings;
  const totalMatches = playerData?.data?.total_matches ?? null;
  const matchesInProgress: number = playerData?.data?.in_progress ?? 0;
  const matchesVoided: number = playerData?.data?.voided ?? 0;
  const recentActivity: ActivityEntry[] = activityData?.data || [];

  const subscriberCount = summary?.total ?? null;
  const payingCount =
    summary != null ? (summary.patreon || 0) + (summary.kofi || 0) : null;
  const revenue = finance?.income ?? null;
  const net = finance?.net ?? null;
  const activeStandings = liveStandings?.filter((s: { dropped: boolean }) => !s.dropped);
  const playerCount = activeStandings?.length ?? null;

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Dashboard
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          European cEDH League overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {subLoading ? (
          <StatSkeleton />
        ) : (
          <StatCard
            title="Subscribers"
            value={subscriberCount != null ? subscriberCount : "--"}
            subtitle={
              payingCount != null
                ? `${payingCount} paying`
                : "No data"
            }
            icon={
              <Users
                className="w-4 h-4"
                style={{ color: "var(--accent)" }}
              />
            }
          />
        )}

        {finLoading ? (
          <StatSkeleton />
        ) : (
          <StatCard
            title="Monthly Revenue"
            value={
              revenue != null
                ? `€${revenue.toFixed(2)}`
                : "--"
            }
            subtitle={
              net != null
                ? `Net: €${net.toFixed(2)}`
                : "No data"
            }
            icon={
              <Wallet
                className="w-4 h-4"
                style={{ color: "var(--accent)" }}
              />
            }
          />
        )}

        {playerLoading ? (
          <StatSkeleton />
        ) : (
          <StatCard
            title="Active Players"
            value={playerCount != null ? playerCount : "--"}
            subtitle={month}
            icon={
              <Swords
                className="w-4 h-4"
                style={{ color: "var(--accent)" }}
              />
            }
          />
        )}

        {playerLoading ? (
          <StatSkeleton />
        ) : (
          <StatCard
            title="Games This Month"
            value={totalMatches != null ? totalMatches : "--"}
            subtitle={
              [
                matchesInProgress > 0 ? `${matchesInProgress} in progress` : "",
                matchesVoided > 0 ? `${matchesVoided} voided` : "",
              ]
                .filter(Boolean)
                .join(", ") || month
            }
            icon={
              <Activity
                className="w-4 h-4"
                style={{ color: "var(--accent)" }}
              />
            }
          />
        )}
      </div>

      {/* Treasury Overview */}
      <div className="mb-8">
        <FinanceOverview />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="p-4 sm:p-6 rounded-xl border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <h2
            className="text-sm font-medium uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            Recent Activity
          </h2>

          {actLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-8 w-full" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              No recent activity.
            </p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((entry, i) => (
                <div
                  key={entry._id?.toString() || i}
                  className="flex items-center gap-3 py-2 border-b last:border-b-0"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background:
                        actionColors[entry.action] || "var(--text-muted)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <span className="font-medium">
                        {entry.user_name || "System"}
                      </span>{" "}
                      <span style={{ color: "var(--text-secondary)" }}>
                        {entry.action}d
                      </span>{" "}
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {entry.entity_type.replace(/_/g, " ")}
                      </span>
                    </p>
                  </div>
                  <span
                    className="text-xs flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {timeAgo(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="p-4 sm:p-6 rounded-xl border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <h2
            className="text-sm font-medium uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            Quick Links
          </h2>
          <div className="space-y-2">
            {[
              { label: "Manage Subscribers", href: "/subscribers" },
              { label: "View Finances", href: "/finance" },
              { label: "Player Standings", href: "/players" },
              { label: "Activity Log", href: "/activity" },
              { label: "Settings", href: "/settings" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
