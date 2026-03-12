"use client";

import { useState } from "react";
import useSWR from "swr";
import { Users, Crown, Coffee, Gift, AlertTriangle } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import MonthPicker from "@/components/dashboard/month-picker";
import SubscriberTable from "@/components/subscribers/subscriber-table";
import SyncButton from "@/components/subscribers/sync-button";
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

export default function SubscribersPage() {
  const [month, setMonth] = useState(getCurrentMonth);

  const { data, error, isLoading, mutate } = useSWR<{ data: SubscriberData }>(
    `/api/subscribers?month=${month}`,
    fetcher
  );

  const subscribers = data?.data?.subscribers || [];
  const summary = data?.data?.summary;

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
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <SyncButton onSynced={() => mutate()} />
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Total Subscribers"
          value={isLoading ? "--" : (summary?.total ?? 0)}
          icon={
            <Users
              className="w-4 h-4"
              style={{ color: "var(--accent)" }}
            />
          }
        />
        <StatCard
          title="Patreon"
          value={isLoading ? "--" : (summary?.patreon ?? 0)}
          icon={
            <Crown
              className="w-4 h-4"
              style={{ color: "var(--status-patreon)" }}
            />
          }
        />
        <StatCard
          title="Ko-fi"
          value={isLoading ? "--" : (summary?.kofi ?? 0)}
          icon={
            <Coffee
              className="w-4 h-4"
              style={{ color: "var(--status-kofi)" }}
            />
          }
        />
        <StatCard
          title="Free Entry"
          value={isLoading ? "--" : (summary?.free ?? 0)}
          icon={
            <Gift
              className="w-4 h-4"
              style={{ color: "var(--status-free)" }}
            />
          }
        />
        <StatCard
          title="Paying Not Playing"
          value={isLoading ? "--" : (summary?.paying_not_playing ?? 0)}
          subtitle="Patreon + Ko-fi without games"
          icon={
            <AlertTriangle
              className="w-4 h-4"
              style={{ color: "var(--warning)" }}
            />
          }
        />
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
        <SubscriberTable subscribers={subscribers} />
      )}
    </div>
  );
}
