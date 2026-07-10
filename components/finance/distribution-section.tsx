"use client";

import { useState } from "react";
import ConfirmModal from "@/components/dashboard/confirm-modal";
import { monthsToDistribute } from "@/lib/distributions-math";
import DistributionPanel from "./distribution-panel";
import { DistributeThroughModal } from "./distribution-modals";
import { useDistributions } from "./use-distributions";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Self-contained distribution controls: the balance panel plus the cumulative
 * distribute-through and roll-back flows. Drop it anywhere (home card, Finance tab).
 */
export default function DistributionSection() {
  const { ledger, isLoading, busyMonth, distributeThrough, undoFrom } = useDistributions();

  const [throughMonth, setThroughMonth] = useState<string | null>(null);
  const [undoMonth, setUndoMonth] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const sel = ledger && throughMonth ? monthsToDistribute(ledger, throughMonth) : null;

  async function confirmThrough() {
    if (!throughMonth) return;
    const m = throughMonth;
    const n = note.trim() || null;
    setThroughMonth(null);
    setNote("");
    await distributeThrough(m, n);
  }

  async function confirmUndo() {
    if (!undoMonth) return;
    const m = undoMonth;
    setUndoMonth(null);
    await undoFrom(m);
  }

  return (
    <>
      <DistributionPanel
        ledger={ledger}
        isLoading={isLoading}
        busyMonth={busyMonth}
        onDistributeThrough={(m) => setThroughMonth(m)}
        onUndoFrom={(m) => setUndoMonth(m)}
      />

      <DistributeThroughModal
        upToMonth={throughMonth}
        sel={sel}
        note={note}
        setNote={setNote}
        onClose={() => { setThroughMonth(null); setNote(""); }}
        onConfirm={confirmThrough}
      />

      <ConfirmModal
        open={!!undoMonth}
        onClose={() => setUndoMonth(null)}
        onConfirm={confirmUndo}
        title="Roll back distribution"
        message={undoMonth ? `Roll distributions back to before ${monthLabel(undoMonth)}? This un-settles ${monthLabel(undoMonth)} and any later month.` : ""}
        confirmLabel="Roll back"
        variant="danger"
      />
    </>
  );
}
