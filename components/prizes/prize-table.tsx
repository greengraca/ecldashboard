"use client";

import { Image as ImageIcon } from "lucide-react";
import DataTable from "@/components/dashboard/data-table";
import type { Column } from "@/components/dashboard/data-table";
import type { Prize } from "@/lib/types";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  mtg_single: { bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7" },
  sponsor: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" },
  treasure_pod: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
  ticket: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e" },
  ring: { bg: "rgba(234, 179, 8, 0.15)", text: "#eab308" },
  other: { bg: "rgba(156, 163, 175, 0.15)", text: "#9ca3af" },
};

const CATEGORY_LABELS: Record<string, string> = {
  mtg_single: "MTG Single",
  sponsor: "Sponsor",
  treasure_pod: "Treasure Pod",
  ticket: "Ticket",
  ring: "Ring",
  other: "Other",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  planned: { bg: "transparent", text: "var(--text-muted)", border: "var(--border)" },
  confirmed: { bg: "rgba(234, 179, 8, 0.15)", text: "#eab308", border: "#eab308" },
  awarded: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e", border: "#22c55e" },
};

const SHIPPING_COLORS: Record<string, { bg: string; text: string }> = {
  not_applicable: { bg: "transparent", text: "var(--text-muted)" },
  pending: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
  shipped: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" },
  delivered: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e" },
};

interface PrizeTableProps {
  prizes: Prize[];
  onRowClick?: (prize: Prize) => void;
}

export default function PrizeTable({ prizes, onRowClick }: PrizeTableProps) {
  const columns: Column<Prize>[] = [
    {
      key: "image",
      label: "",
      className: "w-12",
      render: (p) => (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
          style={{ background: "var(--bg-page)" }}
        >
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
      ),
    },
    {
      key: "name",
      label: "Prize",
      sortable: true,
      render: (p) => (
        <div>
          <div className="font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</div>
          {p.description && (
            <div className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: "var(--text-muted)" }}>
              {p.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (p) => {
        const c = CATEGORY_COLORS[p.category] || CATEGORY_COLORS.other;
        return (
          <span
            className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: c.bg, color: c.text }}
          >
            {CATEGORY_LABELS[p.category] || p.category}
          </span>
        );
      },
    },
    {
      key: "recipient_name",
      label: "Recipient",
      sortable: true,
      render: (p) => (
        <span style={{ color: "var(--text-primary)" }}>{p.recipient_name}</span>
      ),
    },
    {
      key: "value",
      label: "Value",
      sortable: true,
      sortValue: (p) => p.value,
      className: "text-right",
      render: (p) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {p.value > 0 ? `€${p.value.toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (p) => {
        const s = STATUS_COLORS[p.status] || STATUS_COLORS.planned;
        return (
          <span
            className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border"
            style={{ background: s.bg, color: s.text, borderColor: s.border }}
          >
            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </span>
        );
      },
    },
    {
      key: "shipping_status",
      label: "Shipping",
      sortable: true,
      render: (p) => {
        if (p.shipping_status === "not_applicable") {
          return <span style={{ color: "var(--text-muted)" }}>—</span>;
        }
        const s = SHIPPING_COLORS[p.shipping_status];
        return (
          <span
            className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: s.bg, color: s.text }}
          >
            {p.shipping_status.charAt(0).toUpperCase() + p.shipping_status.slice(1)}
          </span>
        );
      },
    },
  ];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.015)",
        border: "1px solid var(--border)",
      }}
    >
      <DataTable<Prize & Record<string, unknown>>
        columns={columns as Column<Prize & Record<string, unknown>>[]}
        data={prizes as (Prize & Record<string, unknown>)[]}
        keyField="_id"
        emptyMessage="No prizes for this month"
        bare
        onRowClick={onRowClick as ((row: Prize & Record<string, unknown>) => void) | undefined}
        rowHover
        renderMobileCard={(p) => (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
              style={{ background: "var(--bg-page)" }}
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                {p.name}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {p.recipient_name} {p.value > 0 ? `· €${p.value.toFixed(2)}` : ""}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {(() => {
                const s = STATUS_COLORS[p.status];
                return (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                    style={{ background: s.bg, color: s.text, borderColor: s.border }}
                  >
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                );
              })()}
              {p.shipping_status !== "not_applicable" && (() => {
                const s = SHIPPING_COLORS[p.shipping_status];
                return (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: s.bg, color: s.text }}
                  >
                    {p.shipping_status.charAt(0).toUpperCase() + p.shipping_status.slice(1)}
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      />
    </div>
  );
}
