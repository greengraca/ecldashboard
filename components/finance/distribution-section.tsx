"use client";

import { useState } from "react";
import useSWR from "swr";
import type { DistributionLedger } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { monthsToDistribute } from "@/lib/distributions-math";
import DistributionPanel from "./distribution-panel";
import Modal from "@/components/dashboard/modal";
import ConfirmModal from "@/components/dashboard/confirm-modal";
import { Sensitive } from "@/components/dashboard/sensitive";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function NoteField({ note, setNote }: { note: string; setNote: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
        Note (optional)
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{ background: "var(--card-inner-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        placeholder="e.g. paid via bank transfer"
      />
    </div>
  );
}

function ModalActions({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={onCancel}
        className="px-3 py-1.5 rounded-lg text-sm font-medium"
        style={{ background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="px-3 py-1.5 rounded-lg text-sm font-medium"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        Confirm distribution
      </button>
    </div>
  );
}

/**
 * Self-contained distribution controls: the ledger panel plus single-month,
 * bulk ("distribute up to"), and undo flows with their confirm dialogs.
 * Owns its own SWR so it can be dropped anywhere (home card, Finance tab).
 */
export default function DistributionSection() {
  const { data, isLoading, mutate } = useSWR<{ data: DistributionLedger }>(
    "/api/finance/distributions",
    fetcher
  );
  const ledger = data?.data ?? null;

  const [distributingMonth, setDistributingMonth] = useState<string | null>(null);
  const [bulkUpTo, setBulkUpTo] = useState<string | null>(null);
  const [undoMonth, setUndoMonth] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyMonth, setBusyMonth] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function confirmSingle() {
    if (!distributingMonth) return;
    const m = distributingMonth;
    setDistributingMonth(null);
    setBusyMonth(m);
    await fetch("/api/finance/distributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: m, note: note.trim() || null }),
    });
    setNote("");
    await mutate();
    setBusyMonth(null);
  }

  async function confirmBulk() {
    if (!bulkUpTo) return;
    const upTo = bulkUpTo;
    setBulkUpTo(null);
    setBulkBusy(true);
    await fetch("/api/finance/distributions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upToMonth: upTo, note: note.trim() || null }),
    });
    setNote("");
    await mutate();
    setBulkBusy(false);
  }

  async function confirmUndo() {
    if (!undoMonth) return;
    const m = undoMonth;
    setUndoMonth(null);
    setBusyMonth(m);
    await fetch(`/api/finance/distributions/${m}`, { method: "DELETE" });
    await mutate();
    setBusyMonth(null);
  }

  const singleRow = ledger?.months.find((r) => r.month === distributingMonth);
  const bulkSel = ledger && bulkUpTo ? monthsToDistribute(ledger, bulkUpTo) : null;

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

      {/* Single-month confirm */}
      <Modal
        open={!!distributingMonth}
        onClose={() => { setDistributingMonth(null); setNote(""); }}
        title="Distribute month"
      >
        {singleRow && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Distribute{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                <Sensitive placeholder="€•••">{`€${singleRow.available.toFixed(2)}`}</Sensitive>
              </strong>{" "}
              for {distributingMonth}. This brings total paid to{" "}
              <Sensitive placeholder="€•••">{`€${singleRow.net.toFixed(2)}`}</Sensitive> — split{" "}
              <Sensitive placeholder="€•••">{`€${(singleRow.net / 2).toFixed(2)}`}</Sensitive> to each group.
            </p>
            <NoteField note={note} setNote={setNote} />
            <ModalActions onCancel={() => { setDistributingMonth(null); setNote(""); }} onConfirm={confirmSingle} />
          </div>
        )}
      </Modal>

      {/* Bulk confirm */}
      <Modal
        open={!!bulkUpTo}
        onClose={() => { setBulkUpTo(null); setNote(""); }}
        title="Distribute range"
      >
        {bulkSel && bulkUpTo && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Distribute{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                <Sensitive placeholder="€•••">{`€${bulkSel.total.toFixed(2)}`}</Sensitive>
              </strong>{" "}
              across <strong style={{ color: "var(--text-primary)" }}>{bulkSel.count}</strong>{" "}
              {bulkSel.count === 1 ? "month" : "months"} (up to {monthLabel(bulkUpTo)}) — split{" "}
              <Sensitive placeholder="€•••">{`€${(bulkSel.total / 2).toFixed(2)}`}</Sensitive> to each group.
            </p>
            <NoteField note={note} setNote={setNote} />
            <ModalActions onCancel={() => { setBulkUpTo(null); setNote(""); }} onConfirm={confirmBulk} />
          </div>
        )}
      </Modal>

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
