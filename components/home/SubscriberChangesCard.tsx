"use client";

import useSWR from "swr";
import { UserPlus, UserMinus } from "lucide-react";
import type { ActivityEntry } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

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
  return `${days}d ago`;
}

function getCurrentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export default function SubscriberChangesCard() {
  const { from, to } = getCurrentMonthRange();
  const { data, isLoading } = useSWR<{ data: ActivityEntry[] }>(
    `/api/activity?entity_type=subscriber&from=${from}&to=${to}&limit=50`,
    fetcher
  );

  const entries = (data?.data || []).filter(
    (e) => e.action === "join" || e.action === "leave"
  );
  const joins = entries.filter((e) => e.action === "join");
  const leaves = entries.filter((e) => e.action === "leave");

  return (
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
        <h2
          className="text-sm font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Subscriber Changes
        </h2>
        {!isLoading && entries.length > 0 && (
          <div className="flex items-center gap-3 text-xs font-medium">
            {joins.length > 0 && (
              <span style={{ color: "var(--success)" }}>+{joins.length}</span>
            )}
            {leaves.length > 0 && (
              <span style={{ color: "var(--error)" }}>-{leaves.length}</span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No changes this month.
        </p>
      ) : (
        <div className="overflow-y-auto space-y-1 pr-1" style={{ maxHeight: "280px" }}>
          {entries.map((entry, i) => (
            <div
              key={entry._id?.toString() || i}
              className="flex items-center gap-3 py-2 border-b last:border-b-0"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {entry.action === "join" ? (
                <UserPlus
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--success)" }}
                />
              ) : (
                <UserMinus
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--error)" }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {(entry.details?.name as string) || entry.entity_id}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {entry.details?.source as string} &middot; {entry.details?.tier as string}
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
  );
}
