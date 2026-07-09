"use client";

import { useState, useEffect, useMemo } from "react";
import { Wallet, AlertTriangle, Loader2 } from "lucide-react";
import type { DistributionLedger, DistributionLedgerRow } from "@/lib/types";
import { Sensitive } from "@/components/dashboard/sensitive";
import { undistributedMonths, monthsToDistribute } from "@/lib/distributions-math";

interface DistributionPanelProps {
  ledger: DistributionLedger | null;
  isLoading: boolean;
  busyMonth: string | null;
  bulkBusy: boolean;
  onRequestDistribute: (month: string) => void;
  onBulkDistribute: (upToMonth: string) => void;
  onUndo: (month: string) => void;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function StatusPill({ row }: { row: DistributionLedgerRow }) {
  const map = {
    distributed: { label: "Distributed", bg: "var(--success-light)", fg: "var(--success)" },
    partial: { label: "Partial", bg: "var(--warning-light, rgba(245,158,11,0.15))", fg: "var(--warning, #f59e0b)" },
    over: { label: "Over-distributed", bg: "var(--error-light)", fg: "var(--error)" },
    retained: { label: "Retained", bg: "var(--card-inner-bg)", fg: "var(--text-muted)" },
    settled: { label: "Settled", bg: "var(--card-inner-bg)", fg: "var(--text-secondary)" },
  } as const;
  const s = map[row.status];
  let text: string = s.label;
  if (row.status === "distributed" && row.distributed_at) text = `✓ ${row.distributed_at.slice(0, 10)}`;
  else if (row.status === "settled") text = "✓ Settled";
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>
      {text}
    </span>
  );
}

export default function DistributionPanel({
  ledger,
  isLoading,
  busyMonth,
  bulkBusy,
  onRequestDistribute,
  onBulkDistribute,
  onUndo,
}: DistributionPanelProps) {
  const options = useMemo(() => (ledger ? undistributedMonths(ledger) : []), [ledger]);
  const [cutoff, setCutoff] = useState<string>("");

  // Default (and keep) the cutoff at the latest undistributed month.
  useEffect(() => {
    if (options.length === 0) return;
    if (!options.includes(cutoff)) {
      setCutoff(options[options.length - 1]);
    }
  }, [options, cutoff]);

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-8 text-center mb-4"
        style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255,255,255,0.10)", boxShadow: "var(--surface-shadow)" }}
      >
        <div className="inline-block w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }
  if (!ledger) return null;

  const total = ledger.available_total;
  const bulk = cutoff ? monthsToDistribute(ledger, cutoff) : null;

  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255,255,255,0.10)", boxShadow: "var(--surface-shadow)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Wallet className="w-4 h-4" style={{ color: "var(--accent)" }} />
            Distribution
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {ledger.undistributed_count} undistributed {ledger.undistributed_count === 1 ? "month" : "months"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Available to distribute
          </p>
          <p className="text-xl font-bold" style={{ color: total > 0 ? "var(--success)" : "var(--text-secondary)" }}>
            <Sensitive placeholder="€•••••">{`€${total.toFixed(2)}`}</Sensitive>
          </p>
          {ledger.carried_deficit > 0.01 && (
            <p className="text-[10px] mt-0.5" style={{ color: "var(--error)" }}>
              <Sensitive placeholder="incl. −€•••">{`incl. −€${ledger.carried_deficit.toFixed(2)} carried`}</Sensitive>
            </p>
          )}
        </div>
      </div>

      {/* Bulk distribute */}
      {options.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Distribute up to</span>
            <select
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
              className="text-xs rounded-lg px-2 py-1.5 cursor-pointer"
              style={{ background: "var(--card-inner-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              {options.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => bulk && bulk.total > 0.01 && onBulkDistribute(cutoff)}
            disabled={bulkBusy || !bulk || bulk.total <= 0.01}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {bulkBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Sensitive placeholder="Distribute €•••">{`Distribute €${Math.max(0, bulk?.total ?? 0).toFixed(2)}`}</Sensitive>
                {bulk && bulk.count > 1 && <span className="opacity-75">· {bulk.count} months</span>}
              </>
            )}
          </button>
        </div>
      )}

      {/* Ledger rows */}
      <div className="space-y-1">
        {ledger.months.map((row) => {
          const isLoss = row.net <= 0 && row.status === "retained";
          const busy = busyMonth === row.month;
          const outstanding = row.net - row.net_paid;
          return (
            <div key={row.month} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "var(--card-inner-bg)" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{monthLabel(row.month)}</span>
                  <span className="text-xs" style={{ color: row.net >= 0 ? "var(--text-secondary)" : "var(--error)" }}>
                    <Sensitive placeholder="€•••">{`${row.net >= 0 ? "+" : "−"}€${Math.abs(row.net).toFixed(2)}`}</Sensitive>
                  </span>
                </div>
                {(row.status === "partial" || row.status === "over") && (
                  <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: "var(--warning, #f59e0b)" }}>
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {row.status === "partial" ? (
                      <Sensitive placeholder="€••• of €•••">{`€${row.net_paid.toFixed(2)} of €${row.net.toFixed(2)} paid — €${outstanding.toFixed(2)} left`}</Sensitive>
                    ) : (
                      <Sensitive placeholder="over by €•••">{`Paid €${row.net_paid.toFixed(2)}, net now €${row.net.toFixed(2)} — over by €${(row.net_paid - row.net).toFixed(2)}`}</Sensitive>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isLoss ? <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span> : <StatusPill row={row} />}
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
                ) : row.available > 0.01 ? (
                  <button
                    onClick={() => onRequestDistribute(row.month)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                  >
                    {row.status === "partial" ? "Distribute rest" : "Distribute"}
                  </button>
                ) : (row.status === "distributed" || row.status === "settled" || row.status === "over") ? (
                  <button
                    onClick={() => onUndo(row.month)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "var(--card-inner-bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  >
                    Undo
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
