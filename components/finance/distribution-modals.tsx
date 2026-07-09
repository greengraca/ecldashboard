"use client";

import Modal from "@/components/dashboard/modal";
import { Sensitive } from "@/components/dashboard/sensitive";
import type { DistributionLedgerRow } from "@/lib/types";

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

function Actions({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
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

/** Single-month distribute confirm. Open when `row` is non-null. */
export function DistributeConfirmModal({
  row,
  note,
  setNote,
  onClose,
  onConfirm,
}: {
  row: DistributionLedgerRow | null;
  note: string;
  setNote: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={!!row} onClose={onClose} title="Distribute month">
      {row && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Distribute{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              <Sensitive placeholder="€•••">{`€${row.available.toFixed(2)}`}</Sensitive>
            </strong>{" "}
            for {monthLabel(row.month)}. This brings total paid to{" "}
            <Sensitive placeholder="€•••">{`€${row.net.toFixed(2)}`}</Sensitive> — split{" "}
            <Sensitive placeholder="€•••">{`€${(row.net / 2).toFixed(2)}`}</Sensitive> to each group.
          </p>
          <NoteField note={note} setNote={setNote} />
          <Actions onCancel={onClose} onConfirm={onConfirm} />
        </div>
      )}
    </Modal>
  );
}

/** Bulk "distribute up to" confirm. Open when `upToMonth` is non-null. */
export function BulkDistributeConfirmModal({
  upToMonth,
  sel,
  note,
  setNote,
  onClose,
  onConfirm,
}: {
  upToMonth: string | null;
  sel: { total: number; count: number } | null;
  note: string;
  setNote: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={!!upToMonth} onClose={onClose} title="Distribute range">
      {sel && upToMonth && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Distribute{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              <Sensitive placeholder="€•••">{`€${sel.total.toFixed(2)}`}</Sensitive>
            </strong>{" "}
            across <strong style={{ color: "var(--text-primary)" }}>{sel.count}</strong>{" "}
            {sel.count === 1 ? "month" : "months"} (up to {monthLabel(upToMonth)}) — split{" "}
            <Sensitive placeholder="€•••">{`€${(sel.total / 2).toFixed(2)}`}</Sensitive> to each group.
          </p>
          <NoteField note={note} setNote={setNote} />
          <Actions onCancel={onClose} onConfirm={onConfirm} />
        </div>
      )}
    </Modal>
  );
}
