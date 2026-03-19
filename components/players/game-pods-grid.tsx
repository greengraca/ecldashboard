"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { GamePod } from "@/lib/topdeck-live";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type StatusFilter = "all" | "completed" | "draw" | "in_progress" | "voided";

// "completed" here means has a winner (not draw)

const PODS_PER_PAGE = 16;

export default function GamePodsGrid({ month }: { month: string }) {
  const { data, isLoading } = useSWR<{ data: GamePod[] }>(
    `/api/players/games?month=${month}`,
    fetcher
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  // Reset page when filter or month changes
  const pods = data?.data || [];

  const counts = useMemo(() => {
    const c = { all: 0, completed: 0, draw: 0, in_progress: 0, voided: 0 };
    for (const p of pods) {
      c.all++;
      c[p.status]++;
    }
    return c;
  }, [pods]);

  const filtered = useMemo(() => {
    const f = statusFilter === "all" ? pods : pods.filter((p) => p.status === statusFilter);
    // Sort by table number descending (most recent first)
    return [...f].sort((a, b) => b.table - a.table || b.season - a.season);
  }, [pods, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PODS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PODS_PER_PAGE, (safePage + 1) * PODS_PER_PAGE);

  const leftFilters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "completed", label: "Wins" },
    { key: "draw", label: "Draws" },
  ];
  const rightFilters: { key: StatusFilter; label: string }[] = [
    { key: "voided", label: "Voided" },
    { key: "in_progress", label: "In Progress" },
  ];

  if (isLoading) {
    return (
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
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
        <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
          Loading game pods...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {leftFilters.map(({ key, label }) => {
          const active = statusFilter === key;
          const count = counts[key];
          return (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setPage(0); }}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--accent-light)" : "var(--bg-card)",
                color: active ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {label} ({count})
            </button>
          );
        })}
        <div className="flex-1" />
        {rightFilters.map(({ key, label }) => {
          const active = statusFilter === key;
          const count = counts[key];
          return (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setPage(0); }}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--accent-light)" : "var(--bg-card)",
                color: active ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: "1.5px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No games found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paginated.map((pod) => (
            <PodCard key={`${pod.season}-${pod.table}`} pod={pod} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(0)}
            disabled={safePage === 0}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: "var(--bg-card)",
              color: safePage === 0 ? "var(--text-muted)" : "var(--text-secondary)",
              border: "1px solid var(--border)",
              opacity: safePage === 0 ? 0.5 : 1,
            }}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: "var(--bg-card)",
              color: safePage === 0 ? "var(--text-muted)" : "var(--text-secondary)",
              border: "1px solid var(--border)",
              opacity: safePage === 0 ? 0.5 : 1,
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs px-3" style={{ color: "var(--text-muted)" }}>
            {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: "var(--bg-card)",
              color: safePage >= totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)",
              border: "1px solid var(--border)",
              opacity: safePage >= totalPages - 1 ? 0.5 : 1,
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(totalPages - 1)}
            disabled={safePage >= totalPages - 1}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: "var(--bg-card)",
              color: safePage >= totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)",
              border: "1px solid var(--border)",
              opacity: safePage >= totalPages - 1 ? 0.5 : 1,
            }}
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function PodCard({ pod }: { pod: GamePod }) {
  const isVoided = pod.status === "voided";
  const isDraw = pod.status === "draw";
  const isInProgress = pod.status === "in_progress";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: isVoided
          ? "1.5px solid var(--error)"
          : isInProgress
          ? "1.5px solid var(--warning)"
          : "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
        opacity: isVoided ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 flex items-center justify-between border-b"
        style={{ borderColor: "var(--border)", background: "var(--card-inner-bg)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Pod {pod.table}
        </span>
        <span className="text-[11px]" style={{ color: statusColor(pod.status) }}>
          {isDraw && "draw"}
          {isVoided && "voided"}
          {isInProgress && "in progress"}
        </span>
      </div>

      {/* Players */}
      <div>
        {pod.players.map((player, i) => {
          const isWinner = pod.winner?.uid === player.uid;
          return (
            <div
              key={player.uid + i}
              className="flex items-center gap-3 px-4 py-2"
              style={{
                borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined,
                background: isWinner
                  ? "rgba(34, 197, 94, 0.12)"
                  : "transparent",
              }}
            >
              {isWinner && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "#22c55e" }}
                />
              )}
              <div className={`min-w-0 flex-1 ${!isWinner ? "ml-[18px]" : ""}`}>
                <p
                  className="text-sm truncate"
                  style={{
                    color: isWinner ? "#22c55e" : "var(--text-primary)",
                    fontWeight: isWinner ? 600 : 400,
                  }}
                >
                  {player.name}
                </p>
              </div>
              {player.discord && (
                <span
                  className="text-[11px] truncate max-w-[120px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {player.discord}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function statusColor(status: GamePod["status"]): string {
  switch (status) {
    case "draw": return "var(--warning)";
    case "voided": return "var(--error)";
    case "in_progress": return "var(--warning)";
    default: return "var(--text-muted)";
  }
}
