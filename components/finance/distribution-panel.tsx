"use client";

import { useState, useEffect, useMemo } from "react";
import { Wallet, AlertTriangle, Loader2, Clock, RotateCcw } from "lucide-react";
import type { DistributionLedger, DistributionLedgerRow } from "@/lib/types";
import { Sensitive } from "@/components/dashboard/sensitive";
import { undistributedMonths, monthsToDistribute } from "@/lib/distributions-math";

interface DistributionPanelProps {
  ledger: DistributionLedger | null;
  isLoading: boolean;
  busyMonth: string | null;
  onDistributeThrough: (upToMonth: string) => void;
  onUndoFrom: (month: string) => void;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function euro(n: number, sign = false): string {
  const s = sign ? (n >= 0 ? "+" : "−") : n < 0 ? "−" : "";
  return `${s}€${Math.abs(n).toFixed(2)}`;
}

function Badge({ children, fg, bg }: { children: React.ReactNode; fg: string; bg: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: bg, color: fg }}>
      {children}
    </span>
  );
}

function StatusBadge({ row }: { row: DistributionLedgerRow }) {
  if (row.status === "distributed")
    return <Badge fg="var(--success)" bg="var(--success-light)">{row.distributed_at ? `✓ ${row.distributed_at.slice(0, 10)}` : "✓ Distributed"}</Badge>;
  if (row.status === "settled")
    return <Badge fg="var(--text-secondary)" bg="var(--card-inner-bg)">{"✓ Settled"}</Badge>;
  if (row.status === "over")
    return <Badge fg="var(--error)" bg="var(--error-light)">Over-distributed</Badge>;
  if (row.status === "partial")
    return <Badge fg="var(--warning, #f59e0b)" bg="var(--warning-light, rgba(245,158,11,0.15))">Partial</Badge>;
  return <Badge fg="var(--text-muted)" bg="var(--card-inner-bg)">Pending</Badge>;
}

function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255,255,255,0.10)", boxShadow: "var(--surface-shadow)" }}
    >
      {children}
    </div>
  );
}

export default function DistributionPanel({
  ledger,
  isLoading,
  busyMonth,
  onDistributeThrough,
  onUndoFrom,
}: DistributionPanelProps) {
  const options = useMemo(() => (ledger ? undistributedMonths(ledger) : []), [ledger]);
  const [cutoff, setCutoff] = useState<string>("");

  useEffect(() => {
    if (options.length === 0) return;
    if (!options.includes(cutoff)) setCutoff(options[options.length - 1]);
  }, [options, cutoff]);

  if (isLoading) {
    return (
      <Surface>
        <div className="text-center py-3">
          <div className="inline-block w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
        </div>
      </Surface>
    );
  }
  if (!ledger) return null;

  const balance = ledger.available_total;
  const through = ledger.distributed_through;
  const bulk = cutoff ? monthsToDistribute(ledger, cutoff) : null;
  const hasPending = ledger.undistributed_count > 0 && balance > 0.01;

  return (
    <Surface>
      {/* Balance headline */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Distribution</h3>
        </div>
        <p className="text-3xl font-bold" style={{ color: balance > 0.01 ? "var(--success)" : balance < -0.01 ? "var(--error)" : "var(--text-primary)" }}>
          <Sensitive placeholder="€•••••">{euro(balance)}</Sensitive>
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {hasPending ? (
            <>Undistributed balance · <Sensitive placeholder="€•••">{euro(balance / 2)}</Sensitive> each group</>
          ) : balance < -0.01 ? (
            <>Net loss since the last distribution — nothing to hand out yet</>
          ) : through ? (
            <>All distributed through {monthLabel(through)}</>
          ) : (
            <>Nothing distributed yet</>
          )}
        </p>
      </div>

      {/* Cumulative distribute control */}
      {hasPending && options.length > 0 && (
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
            onClick={() => bulk && bulk.total > 0.01 && onDistributeThrough(cutoff)}
            disabled={!!busyMonth || !bulk || bulk.total <= 0.01}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {busyMonth ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Sensitive placeholder="Distribute €•••">{`Distribute ${euro(Math.max(0, bulk?.total ?? 0))}`}</Sensitive>
                {bulk && bulk.count > 1 && <span className="opacity-75">· {bulk.count} mo</span>}
              </>
            )}
          </button>
        </div>
      )}

      {/* Completed-month ledger */}
      <div className="space-y-1">
        {ledger.months.map((row) => {
          const settled = row.status === "distributed" || row.status === "settled" || row.status === "over";
          const busy = busyMonth === row.month;
          return (
            <div key={row.month} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "var(--card-inner-bg)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{monthLabel(row.month)}</span>
                <span className="text-xs" style={{ color: row.net >= 0 ? "var(--text-secondary)" : "var(--error)" }}>
                  <Sensitive placeholder="€•••">{euro(row.net, true)}</Sensitive>
                </span>
                {row.status === "over" && (
                  <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--warning, #f59e0b)" }}>
                    <AlertTriangle className="w-3 h-3" /> over by <Sensitive placeholder="€•••">{euro(row.net_paid - row.net)}</Sensitive>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge row={row} />
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
                ) : settled ? (
                  <button
                    onClick={() => onUndoFrom(row.month)}
                    title={`Roll back to before ${monthLabel(row.month)}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "var(--card-inner-bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  >
                    <RotateCcw className="w-3 h-3" /> Undo
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* Current in-progress month — surfaced but NOT distributable */}
        {ledger.current_month && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg mt-1" style={{ border: "1px dashed var(--border)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{monthLabel(ledger.current_month.month)}</span>
              <span className="text-xs" style={{ color: ledger.current_month.net >= 0 ? "var(--text-muted)" : "var(--error)" }}>
                <Sensitive placeholder="€•••">{euro(ledger.current_month.net, true)}</Sensitive>
              </span>
            </div>
            <Badge fg="var(--text-muted)" bg="var(--card-inner-bg)">
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> In progress</span>
            </Badge>
          </div>
        )}
      </div>
    </Surface>
  );
}
