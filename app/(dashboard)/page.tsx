"use client";

import { useState } from "react";
import useSWR from "swr";
import StatCard from "@/components/dashboard/stat-card";
import CalendarWidget from "@/components/dashboard/CalendarWidget";
import TasksWidget from "@/components/dashboard/TasksWidget";
import FinanceOverview from "@/components/finance/finance-overview";
import ProfitSplitTable from "@/components/finance/profit-split-table";
import { Users, Wallet, Swords, Activity, CheckCircle, Clock, List, Group } from "lucide-react";
import type { ActivityEntry, ActivityAction, PendingReimbursement } from "@/lib/types";
import { Sensitive } from "@/components/dashboard/sensitive";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth } from "@/lib/utils";

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
  join: "var(--info)",
  detect: "var(--meeting)",
  end: "var(--text-muted)",
};

function StatSkeleton() {
  return (
    <div
      className="h-full p-3 sm:p-5 rounded-xl"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <div className="flex items-start justify-between mb-1.5 sm:mb-3">
        <div className="skeleton h-3 w-20 sm:w-24 rounded" />
        <div className="skeleton w-8 h-8 rounded-lg hidden sm:block" />
      </div>
      <div className="skeleton h-5 sm:h-7 w-16 sm:w-20 rounded mb-1" />
      <div className="skeleton h-3 w-14 sm:w-16 rounded mt-1" />
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

  const { data: pendingData, isLoading: pendingLoading, mutate: mutatePending } = useSWR<{ data: PendingReimbursement[] }>(
    "/api/finance/pending-reimbursements",
    fetcher
  );

  const [reimbursementsGrouped, setReimbursementsGrouped] = useState(false);

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
  const pendingReimbursements: PendingReimbursement[] = pendingData?.data || [];

  async function handleReimburse(item: PendingReimbursement) {
    try {
      const res = await fetch("/api/finance/reimburse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, source: item.source, reimbursed: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error("Reimburse failed:", body?.error || res.status);
        return;
      }
      mutatePending();
    } catch (err) {
      console.error("Reimburse failed:", err);
    }
  }

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

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {subLoading ? (
          <StatSkeleton />
        ) : (
          <StatCard
            title="Subscribers"
            value={subscriberCount != null ? <Sensitive>{subscriberCount}</Sensitive> : "--"}
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
                ? <Sensitive placeholder="€•••••">{`€${revenue.toFixed(2)}`}</Sensitive>
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

      {/* Calendar + Tasks — calendar drives row height, tasks scroll within */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <div className="lg:col-span-3">
          <CalendarWidget />
        </div>
        <div className="lg:col-span-1 relative">
          <div className="lg:absolute lg:inset-0">
            <TasksWidget />
          </div>
        </div>
      </div>

      {/* Treasury Overview */}
      <div className="mb-8">
        <FinanceOverview />
      </div>

      {/* Group Profit Split */}
      <div className="mb-8">
        <ProfitSplitTable />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="p-4 sm:p-6 rounded-xl"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: "1.5px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "var(--surface-shadow)",
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
                        <Sensitive>{entry.user_name || "System"}</Sensitive>
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
          className="p-4 sm:p-6 rounded-xl"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: "1.5px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2
                className="text-sm font-medium uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Pending Reimbursements
              </h2>
              {!pendingLoading && pendingReimbursements.length > 0 && (
                <span className="text-sm font-bold" style={{ color: "var(--error)" }}>
                  <Sensitive placeholder="€•••••">
                    &euro;{pendingReimbursements.reduce((s, r) => s + r.amount, 0).toFixed(2)}
                  </Sensitive>
                </span>
              )}
            </div>
            {!pendingLoading && pendingReimbursements.length > 0 && (
              <button
                onClick={() => setReimbursementsGrouped(!reimbursementsGrouped)}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                style={{
                  background: reimbursementsGrouped ? "var(--accent-light)" : "transparent",
                  color: reimbursementsGrouped ? "var(--accent)" : "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
                title={reimbursementsGrouped ? "Show flat list" : "Group by person"}
              >
                {reimbursementsGrouped ? <List className="w-3.5 h-3.5" /> : <Group className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {pendingLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-8 w-full" />
              ))}
            </div>
          ) : pendingReimbursements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle className="w-8 h-8" style={{ color: "var(--success)" }} />
              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                All caught up — no pending reimbursements
              </p>
            </div>
          ) : !reimbursementsGrouped ? (
            <div className="overflow-y-auto space-y-1 pr-1" style={{ maxHeight: "320px" }}>
              {pendingReimbursements.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b last:border-b-0"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <Clock
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "var(--warning, #f59e0b)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <Sensitive>{item.description}</Sensitive>
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      <Sensitive>{item.paid_by_name}</Sensitive> &middot; {item.date}
                    </p>
                  </div>
                  <span
                    className="text-sm font-medium flex-shrink-0"
                    style={{ color: "var(--error)" }}
                  >
                    <Sensitive placeholder="€•••••">&euro;{item.amount.toFixed(2)}</Sensitive>
                  </span>
                  <button
                    onClick={() => handleReimburse(item)}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: "var(--success)" }}
                    title="Mark as reimbursed"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (() => {
            const grouped = new Map<string, PendingReimbursement[]>();
            for (const item of pendingReimbursements) {
              const key = item.paid_by_name;
              if (!grouped.has(key)) grouped.set(key, []);
              grouped.get(key)!.push(item);
            }
            return (
              <div className="overflow-y-auto space-y-4 pr-1" style={{ maxHeight: "320px" }}>
                {[...grouped.entries()].map(([name, items]) => {
                  const personTotal = items.reduce((sum, r) => sum + r.amount, 0);
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                          <Sensitive>{name}</Sensitive>
                        </span>
                        <span className="text-xs font-medium tabular-nums" style={{ color: "var(--error)" }}>
                          <Sensitive placeholder="€•••••">&euro;{personTotal.toFixed(2)}</Sensitive>
                        </span>
                      </div>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 py-1.5 border-b last:border-b-0"
                            style={{ borderColor: "var(--border-subtle)" }}
                          >
                            <Clock
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: "var(--warning, #f59e0b)" }}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                <Sensitive>{item.description}</Sensitive>
                              </p>
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {item.date}
                              </p>
                            </div>
                            <span
                              className="text-sm font-medium flex-shrink-0 tabular-nums"
                              style={{ color: "var(--error)" }}
                            >
                              <Sensitive placeholder="€•••••">&euro;{item.amount.toFixed(2)}</Sensitive>
                            </span>
                            <button
                              onClick={() => handleReimburse(item)}
                              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                              style={{ color: "var(--success)" }}
                              title="Mark as reimbursed"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
