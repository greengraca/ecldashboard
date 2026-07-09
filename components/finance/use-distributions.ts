"use client";

import { useState } from "react";
import useSWR from "swr";
import type { DistributionLedger } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

/**
 * Shared distribution controller: the ledger SWR plus the three mutating
 * actions (single distribute / bulk distribute-through / undo) and their busy
 * flags. Used by both the Finance banner and the DistributionSection so there
 * is a single source of truth for the fetch logic.
 */
export function useDistributions() {
  const { data, isLoading, mutate } = useSWR<{ data: DistributionLedger }>(
    "/api/finance/distributions",
    fetcher
  );
  const ledger = data?.data ?? null;
  const [busyMonth, setBusyMonth] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function distribute(month: string, note: string | null) {
    setBusyMonth(month);
    await fetch("/api/finance/distributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, note }),
    });
    await mutate();
    setBusyMonth(null);
  }

  async function bulkDistribute(upToMonth: string, note: string | null) {
    setBulkBusy(true);
    await fetch("/api/finance/distributions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upToMonth, note }),
    });
    await mutate();
    setBulkBusy(false);
  }

  async function undo(month: string) {
    setBusyMonth(month);
    await fetch(`/api/finance/distributions/${month}`, { method: "DELETE" });
    await mutate();
    setBusyMonth(null);
  }

  return { ledger, isLoading, mutate, busyMonth, bulkBusy, distribute, bulkDistribute, undo };
}
