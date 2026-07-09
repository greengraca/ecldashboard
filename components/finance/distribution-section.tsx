"use client";

import { useState } from "react";
import ConfirmModal from "@/components/dashboard/confirm-modal";
import { monthsToDistribute } from "@/lib/distributions-math";
import DistributionPanel from "./distribution-panel";
import { DistributeConfirmModal, BulkDistributeConfirmModal } from "./distribution-modals";
import { useDistributions } from "./use-distributions";

/**
 * Self-contained distribution controls: the ledger panel plus single-month,
 * bulk ("distribute up to"), and undo flows with their confirm dialogs.
 * Drop it anywhere (home card, Finance tab); it owns its own SWR.
 */
export default function DistributionSection() {
  const { ledger, isLoading, busyMonth, bulkBusy, distribute, bulkDistribute, undo } = useDistributions();

  const [distributingMonth, setDistributingMonth] = useState<string | null>(null);
  const [bulkUpTo, setBulkUpTo] = useState<string | null>(null);
  const [undoMonth, setUndoMonth] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const singleRow = ledger?.months.find((r) => r.month === distributingMonth) ?? null;
  const bulkSel = ledger && bulkUpTo ? monthsToDistribute(ledger, bulkUpTo) : null;

  async function confirmSingle() {
    if (!distributingMonth) return;
    const m = distributingMonth;
    const n = note.trim() || null;
    setDistributingMonth(null);
    setNote("");
    await distribute(m, n);
  }

  async function confirmBulk() {
    if (!bulkUpTo) return;
    const upTo = bulkUpTo;
    const n = note.trim() || null;
    setBulkUpTo(null);
    setNote("");
    await bulkDistribute(upTo, n);
  }

  async function confirmUndo() {
    if (!undoMonth) return;
    const m = undoMonth;
    setUndoMonth(null);
    await undo(m);
  }

  return (
    <>
      <DistributionPanel
        ledger={ledger}
        isLoading={isLoading}
        busyMonth={busyMonth}
        bulkBusy={bulkBusy}
        onRequestDistribute={(m) => setDistributingMonth(m)}
        onBulkDistribute={(upTo) => setBulkUpTo(upTo)}
        onUndo={(m) => setUndoMonth(m)}
      />

      <DistributeConfirmModal
        row={singleRow}
        note={note}
        setNote={setNote}
        onClose={() => { setDistributingMonth(null); setNote(""); }}
        onConfirm={confirmSingle}
      />

      <BulkDistributeConfirmModal
        upToMonth={bulkUpTo}
        sel={bulkSel}
        note={note}
        setNote={setNote}
        onClose={() => { setBulkUpTo(null); setNote(""); }}
        onConfirm={confirmBulk}
      />

      <ConfirmModal
        open={!!undoMonth}
        onClose={() => setUndoMonth(null)}
        onConfirm={confirmUndo}
        title="Undo distribution"
        message={undoMonth ? `Undo the distribution record for ${undoMonth}? The month returns to the available balance.` : ""}
        confirmLabel="Undo"
        variant="danger"
      />
    </>
  );
}
