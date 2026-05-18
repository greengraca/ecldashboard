"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Users,
  Crown,
  Coffee,
  Gift,
  AlertTriangle,
  HandCoins,
  Gamepad2,
} from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import MonthPicker from "@/components/dashboard/month-picker";
import PageHeader from "@/components/dashboard/page-header";
import Banner from "@/components/dashboard/banner";
import FilterBar from "@/components/dashboard/filter-bar";
import LoadingSurface from "@/components/dashboard/loading-surface";
import SubscriberTable from "@/components/subscribers/subscriber-table";
import type { Subscriber, SubscriberSummary } from "@/lib/types";
import { Sensitive } from "@/components/dashboard/sensitive";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth } from "@/lib/utils";

interface SubscriberData {
  subscribers: Subscriber[];
  summary: SubscriberSummary;
  month: string;
}

type SourceFilter = "all" | "patreon" | "kofi" | "free" | "manual" | "paying_not_playing";

export default function SubscribersContent() {
  const router = useRouter();
  const [month, setMonth] = useState(getCurrentMonth);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [, startTransition] = useTransition();

  const { data, error, isLoading } = useSWR<{ data: SubscriberData }>(
    `/api/subscribers?month=${month}`,
    fetcher
  );

  const { data: manualData, mutate: mutateManual } = useSWR<{
    data: { discord_id: string }[];
  }>(`/api/subscribers/manual-payments?month=${month}`, fetcher);

  const { data: identityData } = useSWR<{ data: Record<string, string> }>(
    "/api/players/identities?map=true",
    fetcher
  );
  const identityMap = identityData?.data || {};

  const manualPaidIds = new Set(
    (manualData?.data || []).map((m) => m.discord_id)
  );

  const subscribers = data?.data?.subscribers || [];
  const summary = data?.data?.summary;

  const isPaying = (s: Subscriber) =>
    s.source === "patreon" || s.source === "kofi" || (s.source === "free" && manualPaidIds.has(s.discord_id));

  const manualPaidCount = subscribers.filter((s) => s.source === "free" && manualPaidIds.has(s.discord_id)).length;
  const freeCount = (summary?.free ?? 0) - manualPaidCount;
  const payingNotPlayingCount = subscribers.filter((s) => isPaying(s) && !s.is_playing).length;

  const filteredSubscribers = subscribers.filter((s) => {
    if (sourceFilter === "all") return true;
    if (sourceFilter === "paying_not_playing") return isPaying(s) && !s.is_playing;
    if (sourceFilter === "manual") return s.source === "free" && manualPaidIds.has(s.discord_id);
    if (sourceFilter === "free") return s.source === "free" && !manualPaidIds.has(s.discord_id);
    return s.source === sourceFilter;
  });

  const handleToggleManualPaid = async (
    discordId: string,
    markAsPaid: boolean
  ) => {
    const method = markAsPaid ? "POST" : "DELETE";
    await fetch(`/api/subscribers/${discordId}/manual-payment?month=${month}`, {
      method,
    });
    mutateManual();
  };

  // FilterBar chips. "Manual" only appears when there's at least one.
  const filterChips = [
    { key: "patreon", label: "Patreon", count: summary?.patreon ?? 0 },
    { key: "kofi", label: "Ko-fi", count: summary?.kofi ?? 0 },
    { key: "free", label: "Free", count: freeCount },
    ...(manualPaidCount > 0
      ? [{ key: "manual", label: "Manual", count: manualPaidCount }]
      : []),
    { key: "paying_not_playing", label: "Paying not playing", count: payingNotPlayingCount },
  ];

  return (
    <div>
      <PageHeader
        title="Subscribers"
        subtitle="Manage and monitor subscription status"
        action={
          <MonthPicker
            value={month}
            onChange={(m) => startTransition(() => setMonth(m))}
            minMonth="2025-12"
            maxMonth={getCurrentMonth()}
          />
        }
      />

      {/* Error state */}
      {error && (
        <div className="mb-6">
          <Banner
            variant="error"
            message="Failed to load subscriber data. Please try again."
          />
        </div>
      )}

      {/* Data-health warnings */}
      {!isLoading && summary?.data_warnings && summary.data_warnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {summary.data_warnings.map((w, i) => {
            const hasDetails = w.details && w.details.length > 0;
            return (
              <Banner
                key={i}
                variant="warning"
                message={
                  <>
                    <strong className="uppercase">{w.source}:</strong> {w.message}
                  </>
                }
                details={
                  hasDetails ? (
                    <div className="flex flex-wrap gap-1.5">
                      {w.details!.map((d, j) => {
                        const uid = identityMap[d.discord_id];
                        const badge = (
                          <span
                            className={`px-2 py-0.5 rounded text-xs inline-block${uid ? " hover:underline" : ""}`}
                            style={{
                              background: "rgba(251, 191, 36, 0.12)",
                              color: "var(--warning)",
                            }}
                          >
                            {d.name}
                          </span>
                        );
                        return uid ? (
                          <Link
                            key={j}
                            href={`/league/${uid}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {badge}
                          </Link>
                        ) : (
                          <span key={j}>{badge}</span>
                        );
                      })}
                    </div>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* Status row — display-only KPIs */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 ${manualPaidCount > 0 ? "lg:grid-cols-7" : "lg:grid-cols-6"} gap-3 sm:gap-4 mb-6`}
      >
        <StatCard
          title="Total Subscribers"
          value={isLoading ? "--" : <Sensitive>{summary?.total ?? 0}</Sensitive>}
          icon={<Users className="w-4 h-4" style={{ color: "var(--accent)" }} />}
        />
        <StatCard
          title="In Bracket"
          value={isLoading ? "--" : <Sensitive>{summary?.registered_players ?? "--"}</Sensitive>}
          subtitle={
            !isLoading && summary?.registered_players != null && summary.total > 0
              ? `${summary.total - (summary.registered_players ?? 0)} not registered`
              : undefined
          }
          icon={<Gamepad2 className="w-4 h-4" style={{ color: "var(--accent)" }} />}
        />
        <StatCard
          title="Patreon"
          value={isLoading ? "--" : <Sensitive>{summary?.patreon ?? 0}</Sensitive>}
          icon={<Crown className="w-4 h-4" style={{ color: "var(--status-patreon)" }} />}
        />
        <StatCard
          title="Ko-fi"
          value={isLoading ? "--" : <Sensitive>{summary?.kofi ?? 0}</Sensitive>}
          icon={<Coffee className="w-4 h-4" style={{ color: "var(--status-kofi)" }} />}
        />
        {manualPaidCount > 0 && (
          <StatCard
            title="Manually Paid"
            value={isLoading ? "--" : <Sensitive>{manualPaidCount}</Sensitive>}
            icon={<HandCoins className="w-4 h-4" style={{ color: "var(--success)" }} />}
          />
        )}
        <StatCard
          title="Free Entry"
          value={isLoading ? "--" : <Sensitive>{freeCount}</Sensitive>}
          icon={<Gift className="w-4 h-4" style={{ color: "var(--status-free)" }} />}
        />
        <StatCard
          title="Paying Not Playing"
          value={isLoading ? "--" : <Sensitive>{payingNotPlayingCount}</Sensitive>}
          icon={<AlertTriangle className="w-4 h-4" style={{ color: "var(--warning)" }} />}
        />
      </div>

      {/* FilterBar — single canonical filter pattern */}
      <div className="mb-4">
        <FilterBar
          chips={filterChips}
          active={sourceFilter}
          onChange={(key) => setSourceFilter(key as SourceFilter)}
        />
      </div>

      {/* Subscriber Table */}
      {isLoading ? (
        <LoadingSurface message="Loading subscribers..." />
      ) : (
        <SubscriberTable
          subscribers={filteredSubscribers}
          manualPaidIds={manualPaidIds}
          onToggleManualPaid={handleToggleManualPaid}
          onPlayerClick={(discordId) => {
            const uid = identityMap[discordId];
            if (uid) router.push(`/league/${uid}`);
          }}
        />
      )}
    </div>
  );
}
