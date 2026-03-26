"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import DataTable, { type Column } from "@/components/dashboard/data-table";
import type { Subscriber, SubscriptionSource } from "@/lib/types";
import { Sensitive } from "@/components/dashboard/sensitive";

interface SubscriberTableProps {
  subscribers: Subscriber[];
  filterSource?: SubscriptionSource | null;
  manualPaidIds?: Set<string>;
  onToggleManualPaid?: (discordId: string, isPaid: boolean) => void;
  onPlayerClick?: (discordId: string) => void;
}

const SOURCE_BADGES: Record<
  SubscriptionSource,
  { label: string; color: string; bg: string }
> = {
  patreon: {
    label: "Patreon",
    color: "var(--status-patreon)",
    bg: "var(--status-patreon-light)",
  },
  kofi: {
    label: "Ko-fi",
    color: "var(--status-kofi)",
    bg: "var(--status-kofi-light)",
  },
  free: {
    label: "Free",
    color: "var(--status-free)",
    bg: "var(--status-free-light)",
  },
};

function SourceBadge({ source }: { source: SubscriptionSource }) {
  const badge = SOURCE_BADGES[source];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: badge.color, background: badge.bg }}
    >
      {badge.label}
    </span>
  );
}

function FreeReasonBadge({ reason, muted = false }: { reason: string; muted?: boolean }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        color: "var(--status-free)",
        background: "var(--status-free-light)",
        opacity: muted ? 0.6 : 1,
      }}
    >
      Free: {reason}
    </span>
  );
}

function PlayingStatus({ isPlaying }: { isPlaying: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs"
      style={{ color: isPlaying ? "var(--success)" : "var(--text-muted)" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: isPlaying ? "var(--success)" : "var(--text-muted)",
        }}
      />
      {isPlaying ? "Active" : "Inactive"}
    </span>
  );
}

export default function SubscriberTable({
  subscribers,
  filterSource,
  manualPaidIds,
  onToggleManualPaid,
  onPlayerClick,
}: SubscriberTableProps) {
  const columns: Column<Subscriber & Record<string, unknown>>[] = [
    {
      key: "display_name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.avatar_url ? (
            <img
              src={row.avatar_url as string}
              alt=""
              className="w-7 h-7 rounded-full"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
              style={{
                background: "var(--accent-light)",
                color: "var(--accent)",
              }}
            >
              {(row.display_name as string).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              <Sensitive>{row.display_name as string}</Sensitive>
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              <Sensitive>{row.username as string}</Sensitive>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "source",
      label: "Source",
      sortable: true,
      sortValue: (row) => {
        const reason = row.free_entry_reason as string | null;
        if (row.source === "free" && reason) return `free:${reason}`;
        return row.source as string;
      },
      render: (row) => {
        const isPaid = manualPaidIds?.has(row.discord_id as string);
        const freeReason = row.free_entry_reason as string | null;
        const isFreeSource = row.source === "free";
        return (
          <div className="flex items-center gap-2.5">
            {/* For free subscribers with a reason, replace generic badge */}
            {isFreeSource && freeReason ? (
              <FreeReasonBadge reason={freeReason} />
            ) : (
              <SourceBadge source={row.source as SubscriptionSource} />
            )}
            {/* For paid subscribers with a reason, show muted secondary badge */}
            {!isFreeSource && freeReason && (
              <FreeReasonBadge reason={freeReason} muted />
            )}
            {isFreeSource && onToggleManualPaid && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleManualPaid(row.discord_id as string, !isPaid);
                }}
                className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors"
                style={{
                  background: isPaid ? "var(--accent)" : "var(--border)",
                }}
                title={isPaid ? "Unmark manual payment" : "Mark as manually paid"}
              >
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 rounded-full transition-all duration-200"
                  style={{
                    background: isPaid ? "var(--accent-text)" : "var(--text-muted)",
                    transform: isPaid ? "translate(13px, -50%)" : "translate(5px, -50%)",
                  }}
                />
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "tier",
      label: "Tier",
      sortable: true,
      render: (row) => {
        const isPaid = row.source === "free" && manualPaidIds?.has(row.discord_id as string);
        return (
          <span>{isPaid ? "Manually Paid" : (row.tier as string)}</span>
        );
      },
    },
    {
      key: "is_playing",
      label: "Status",
      sortable: true,
      render: (row) => <PlayingStatus isPlaying={row.is_playing as boolean} />,
    },
    {
      key: "games_played",
      label: "Games",
      sortable: true,
      className: "text-center",
      render: (row) => (
        <span className="tabular-nums">{row.games_played as number}</span>
      ),
    },
  ];
  const PAGE_SIZE = 16;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasOnLastPage = useRef(false);

  useEffect(() => {
    if (wasOnLastPage.current && containerRef.current) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
      });
      wasOnLastPage.current = false;
    }
  }, [page]);

  // Reset page when subscribers or filter changes
  useEffect(() => { setPage(0); }, [subscribers, filterSource]);

  const filtered = subscribers.filter((s) => {
    const matchesSource = !filterSource || s.source === filterSource;
    const matchesSearch =
      !search ||
      s.display_name.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase());
    return matchesSource && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const navigatePage = (newPage: number) => {
    wasOnLastPage.current = page >= totalPages - 1;
    setPage(newPage);
  };

  // Cast for DataTable compatibility
  const data = paged as unknown as (Subscriber & Record<string, unknown>)[];

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.015)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="relative max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search subscribers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm outline-none transition-colors hover:border-[var(--text-muted)] focus:border-[var(--accent)]"
            style={{
              background: "var(--bg-page)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data}
        keyField="discord_id"
        emptyMessage="No subscribers found for this month"
        rowHover
        onRowClick={onPlayerClick ? (row) => onPlayerClick(row.discord_id as string) : undefined}
        defaultSortKey="is_playing"
        defaultSortDir="desc"
        renderMobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {row.avatar_url ? (
                  <img src={row.avatar_url as string} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                  >
                    {(row.display_name as string).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    <Sensitive>{row.display_name as string}</Sensitive>
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    <Sensitive>{row.username as string}</Sensitive>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {row.source === "free" && (row.free_entry_reason as string | null) ? (
                  <FreeReasonBadge reason={row.free_entry_reason as string} />
                ) : (
                  <SourceBadge source={row.source as SubscriptionSource} />
                )}
                {row.source !== "free" && (row.free_entry_reason as string | null) && (
                  <FreeReasonBadge reason={row.free_entry_reason as string} muted />
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
              <PlayingStatus isPlaying={row.is_playing as boolean} />
              {row.tier && <span>Tier: {row.tier as string}</span>}
              <span className="tabular-nums">{row.games_played as number} games</span>
            </div>
          </div>
        )}
      />
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigatePage(0)}
              disabled={page === 0}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors"
              style={{
                background: page === 0 ? "transparent" : "var(--bg-hover)",
                color: page === 0 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page === 0 ? 0.5 : 1,
                cursor: page === 0 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigatePage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors"
              style={{
                background: page === 0 ? "transparent" : "var(--bg-hover)",
                color: page === 0 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page === 0 ? 0.5 : 1,
                cursor: page === 0 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs tabular-nums px-1.5" style={{ color: "var(--text-secondary)" }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => navigatePage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors"
              style={{
                background: page >= totalPages - 1 ? "transparent" : "var(--bg-hover)",
                color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page >= totalPages - 1 ? 0.5 : 1,
                cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigatePage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors"
              style={{
                background: page >= totalPages - 1 ? "transparent" : "var(--bg-hover)",
                color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page >= totalPages - 1 ? 0.5 : 1,
                cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
