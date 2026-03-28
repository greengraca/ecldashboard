"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Users, Crown, Coffee, Gift, AlertTriangle, HandCoins, Gamepad2, Info } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import MonthPicker from "@/components/dashboard/month-picker";
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

interface SubscribersContentProps {
  initialData?: { data: SubscriberData };
  defaultMonth: string;
}

export default function SubscribersContent({ initialData, defaultMonth }: SubscribersContentProps) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [isPending, startTransition] = useTransition();

  const { data, error, isLoading, mutate } = useSWR<{ data: SubscriberData }>(
    `/api/subscribers?month=${month}`,
    fetcher,
    // Only use fallbackData for the initial month (server-fetched)
    { fallbackData: month === defaultMonth ? initialData : undefined }
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

  const filteredSubscribers = subscribers.filter((s) => {
    if (sourceFilter === "all") return true;
    if (sourceFilter === "paying_not_playing") return isPaying(s) && !s.is_playing;
    if (sourceFilter === "manual") return s.source === "free" && manualPaidIds.has(s.discord_id);
    if (sourceFilter === "free") return s.source === "free" && !manualPaidIds.has(s.discord_id);
    return s.source === sourceFilter;
  });

  const toggleFilter = (f: SourceFilter) => setSourceFilter((prev) => (prev === f ? "all" : f));

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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Subscribers
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage and monitor subscription status
          </p>
        </div>
        <MonthPicker value={month} onChange={(m) => startTransition(() => setMonth(m))} minMonth="2025-12" maxMonth={getCurrentMonth()} />
      </div>

      {/* Error state */}
      {error && (
        <div
          className="mb-6 p-4 rounded-xl border text-sm"
          style={{
            background: "var(--error-light)",
            borderColor: "var(--error-border)",
            color: "var(--error)",
          }}
        >
          Failed to load subscriber data. Please try again.
        </div>
      )}

      {/* Summary Cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${manualPaidCount > 0 ? "lg:grid-cols-7" : "lg:grid-cols-6"} gap-3 sm:gap-4 mb-4`}>
        <div className="cursor-pointer" onClick={() => toggleFilter("all")}>
          <StatCard
            title="Total Subscribers"
            value={isLoading ? "--" : <Sensitive>{summary?.total ?? 0}</Sensitive>}
            active={sourceFilter === "all"}
            icon={
              <Users
                className="w-4 h-4"
                style={{ color: "var(--accent)" }}
              />
            }
          />
        </div>
        <StatCard
          title="In Bracket"
          value={isLoading ? "--" : <Sensitive>{summary?.registered_players ?? "--"}</Sensitive>}
          subtitle={!isLoading && summary?.registered_players != null && summary.total > 0
            ? `${summary.total - (summary.registered_players ?? 0)} not registered`
            : undefined}
          icon={
            <Gamepad2
              className="w-4 h-4"
              style={{ color: "var(--accent)" }}
            />
          }
        />
        <div className="cursor-pointer" onClick={() => toggleFilter("patreon")}>
          <StatCard
            title="Patreon"
            value={isLoading ? "--" : <Sensitive>{summary?.patreon ?? 0}</Sensitive>}
            active={sourceFilter === "patreon"}
            icon={
              <Crown
                className="w-4 h-4"
                style={{ color: "var(--status-patreon)" }}
              />
            }
          />
        </div>
        <div className="cursor-pointer" onClick={() => toggleFilter("kofi")}>
          <StatCard
            title="Ko-fi"
            value={isLoading ? "--" : <Sensitive>{summary?.kofi ?? 0}</Sensitive>}
            active={sourceFilter === "kofi"}
            icon={
              <Coffee
                className="w-4 h-4"
                style={{ color: "var(--status-kofi)" }}
              />
            }
          />
        </div>
        {manualPaidCount > 0 && (
          <div className="cursor-pointer" onClick={() => toggleFilter("manual")}>
            <StatCard
              title="Manually Paid"
              value={isLoading ? "--" : <Sensitive>{manualPaidCount}</Sensitive>}
              active={sourceFilter === "manual"}
              icon={
                <HandCoins
                  className="w-4 h-4"
                  style={{ color: "var(--success)" }}
                />
              }
            />
          </div>
        )}
        <div className="cursor-pointer" onClick={() => toggleFilter("free")}>
          <StatCard
            title="Free Entry"
            value={isLoading ? "--" : <Sensitive>{freeCount}</Sensitive>}
            active={sourceFilter === "free"}
            icon={
              <Gift
                className="w-4 h-4"
                style={{ color: "var(--status-free)" }}
              />
            }
          />
        </div>
        <div className="cursor-pointer" onClick={() => toggleFilter("paying_not_playing")}>
          <StatCard
            title="Paying Not Playing"
            value={isLoading ? "--" : <Sensitive>{subscribers.filter((s) => isPaying(s) && !s.is_playing).length}</Sensitive>}
            active={sourceFilter === "paying_not_playing"}
            icon={
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: "var(--warning)" }}
              />
            }
          />
        </div>
      </div>

      {/* Data Health Warnings */}
      {!isLoading && summary?.data_warnings && summary.data_warnings.length > 0 && (
        <div className="mb-8 space-y-2">
          {summary.data_warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-4 py-2.5 rounded-lg border text-xs"
              style={{
                background: "rgba(251, 191, 36, 0.08)",
                borderColor: "var(--warning)",
                color: "var(--warning)",
              }}
            >
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <strong className="uppercase">{w.source}:</strong> {w.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!summary?.data_warnings || summary.data_warnings.length === 0) && (
        <div className="mb-8" />
      )}

      {/* Subscriber Table */}
      {isLoading ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: "1.5px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <div
            className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
          <p
            className="text-sm mt-3"
            style={{ color: "var(--text-muted)" }}
          >
            Loading subscribers...
          </p>
        </div>
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
