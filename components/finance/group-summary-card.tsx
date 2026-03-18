"use client";

import { CheckCircle, Clock } from "lucide-react";
import type { GroupSummary, PendingReimbursement } from "@/lib/types";
import { GROUPS } from "@/lib/constants";
import { Sensitive } from "@/components/dashboard/sensitive";

interface GroupSummaryCardProps {
  summary: GroupSummary | null;
  isLoading: boolean;
  onReimburse: (id: string, source: "transaction" | "fixed_cost", currentlyReimbursed: boolean) => void;
}

function GroupColumn({ group, detail }: { group: "cedhpt" | "ca"; detail: GroupSummary["groups"]["cedhpt"] }) {
  const members = group === "cedhpt" ? GROUPS.cedhpt.members : GROUPS.ca.members;
  const isPositive = detail.profit_share >= 0;

  return (
    <div
      className="flex-1 rounded-lg border p-4"
      style={{ background: "var(--card-inner-bg)", borderColor: "var(--border)" }}
    >
      <h4 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {detail.label}
      </h4>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        <Sensitive>{members.join(", ")}</Sensitive>
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Profit share (50%)</span>
          <span
            className="text-sm font-semibold"
            style={{ color: isPositive ? "var(--success)" : "var(--error)" }}
          >
            <Sensitive placeholder="€•••••">{isPositive ? "+" : ""}&euro;{detail.profit_share.toFixed(2)}</Sensitive>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Expenses paid</span>
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            <Sensitive placeholder="€•••••">&euro;{detail.expenses_paid.toFixed(2)}</Sensitive>
          </span>
        </div>
        {detail.pending > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--warning, #f59e0b)" }}>Pending reimbursement</span>
            <span className="text-sm font-medium" style={{ color: "var(--warning, #f59e0b)" }}>
              <Sensitive placeholder="€•••••">&euro;{detail.pending.toFixed(2)}</Sensitive>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingItem({
  item,
  onReimburse,
}: {
  item: PendingReimbursement;
  onReimburse: (id: string, source: "transaction" | "fixed_cost", currentlyReimbursed: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Clock className="w-4 h-4 shrink-0" style={{ color: "var(--warning, #f59e0b)" }} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            <Sensitive>{item.description}</Sensitive>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              <Sensitive>{item.paid_by_name}</Sensitive>
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.date}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
              style={{
                background: item.source === "transaction" ? "var(--accent-light)" : "rgba(139, 92, 246, 0.15)",
                color: item.source === "transaction" ? "var(--accent)" : "#8b5cf6",
              }}
            >
              {item.source === "fixed_cost" ? "fixed cost" : item.source}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium" style={{ color: "var(--error)" }}>
          <Sensitive placeholder="€•••••">&euro;{item.amount.toFixed(2)}</Sensitive>
        </span>
        <button
          onClick={() => onReimburse(item.id, item.source, false)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: "var(--success-light)",
            color: "var(--success)",
          }}
        >
          <CheckCircle className="w-3 h-3" />
          Reimburse
        </button>
      </div>
    </div>
  );
}

export default function GroupSummaryCard({ summary, isLoading, onReimburse }: GroupSummaryCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
      >
        <div
          className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Group Profit Split
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Net: <Sensitive placeholder="€•••••">&euro;{summary.total_net.toFixed(2)}</Sensitive> &middot; 50/50 split: <Sensitive placeholder="€•••••">&euro;{summary.profit_split.toFixed(2)}</Sensitive> each
        </p>
      </div>

      {/* Two-column group layout */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <GroupColumn group="cedhpt" detail={summary.groups.cedhpt} />
        <GroupColumn group="ca" detail={summary.groups.ca} />
      </div>

      {/* Pending reimbursements */}
      <div>
        <h4
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          Pending Reimbursements
        </h4>
        {summary.pending_reimbursements.length === 0 ? (
          <p
            className="text-sm text-center py-4 rounded-lg"
            style={{ color: "var(--text-muted)", background: "var(--card-inner-bg)" }}
          >
            All caught up — no pending reimbursements
          </p>
        ) : (
          <div className="space-y-1">
            {summary.pending_reimbursements.map((item) => (
              <PendingItem key={item.id} item={item} onReimburse={onReimburse} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
