"use client";

import { useState } from "react";
import useSWR from "swr";
import { Users, Crown, Coffee, Gift, AlertTriangle } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import MonthPicker from "@/components/dashboard/month-picker";
import SubscriberTable from "@/components/subscribers/subscriber-table";
import type { Subscriber, SubscriberSummary } from "@/lib/types";

interface SubscriberData {
  subscribers: Subscriber[];
  summary: SubscriberSummary;
  month: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

type SourceFilter = "all" | "patreon" | "kofi" | "free" | "paying_not_playing";

export default function SubscribersPage() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const { data, error, isLoading, mutate } = useSWR<{ data: SubscriberData }>(
    `/api/subscribers?month=${month}`,
    fetcher
  );

  const { data: manualData, mutate: mutateManual } = useSWR<{
    data: { discord_id: string }[];
  }>(`/api/subscribers/manual-payments?month=${month}`, fetcher);

  const manualPaidIds = new Set(
    (manualData?.data || []).map((m) => m.discord_id)
  );

  const subscribers = data?.data?.subscribers || [];
  const summary = data?.data?.summary;

  const filteredSubscribers = subscribers.filter((s) => {
    if (sourceFilter === "all") return true;
    if (sourceFilter === "paying_not_playing") return (s.source === "patreon" || s.source === "kofi") && !s.is_playing;
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
        <MonthPicker value={month} onChange={setMonth} minMonth="2025-12" maxMonth={getCurrentMonth()} />
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <div className="cursor-pointer" onClick={() => toggleFilter("all")}>
          <StatCard
            title="Total Subscribers"
            value={isLoading ? "--" : (summary?.total ?? 0)}
            active={sourceFilter === "all"}
            icon={
              <Users
                className="w-4 h-4"
                style={{ color: "var(--accent)" }}
              />
            }
          />
        </div>
        <div className="cursor-pointer" onClick={() => toggleFilter("patreon")}>
          <StatCard
            title="Patreon"
            value={isLoading ? "--" : (summary?.patreon ?? 0)}
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
            value={isLoading ? "--" : (summary?.kofi ?? 0)}
            active={sourceFilter === "kofi"}
            icon={
              <Coffee
                className="w-4 h-4"
                style={{ color: "var(--status-kofi)" }}
              />
            }
          />
        </div>
        <div className="cursor-pointer" onClick={() => toggleFilter("free")}>
          <StatCard
            title="Free Entry"
            value={isLoading ? "--" : (summary?.free ?? 0)}
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
            value={isLoading ? "--" : (summary?.paying_not_playing ?? 0)}

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

      {/* Subscriber Table */}
      {isLoading ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
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
        />
      )}
    </div>
  );
}
