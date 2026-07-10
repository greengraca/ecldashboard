"use client";

import { useState } from "react";
import useSWR from "swr";
import type { DistributionLedger } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

/**
 * Shared distribution controller: the ledger SWR plus the two cumulative actions —
 * distribute-through (settle the net of every pending month up to a cutoff) and
 * undo-from (roll the watermark back to before a month). Used by both the Finance
 * banner and the DistributionSection so there's one source of truth.
 */
export function useDistributions() {
  const { data, isLoading, mutate } = useSWR<{ data: DistributionLedger }>(
    "/api/finance/distributions",
    fetcher
  );
  const ledger = data?.data ?? null;
  const [busyMonth, setBusyMonth] = useState<string | null>(null);

  async function distributeThrough(upToMonth: string, note: string | null) {
    setBusyMonth(upToMonth);
    await fetch("/api/finance/distributions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upToMonth, note }),
    });
    await mutate();
    setBusyMonth(null);
  }

  async function undoFrom(month: string) {
    setBusyMonth(month);
    await fetch(`/api/finance/distributions/${month}`, { method: "DELETE" });
    await mutate();
    setBusyMonth(null);
  }

  return { ledger, isLoading, mutate, busyMonth, distributeThrough, undoFrom };
}
