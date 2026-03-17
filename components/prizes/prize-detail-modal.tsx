"use client";

import { Image as ImageIcon, ExternalLink, Trash2, Pencil } from "lucide-react";
import Modal from "@/components/dashboard/modal";
import type { Prize } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  mtg_single: "MTG Single",
  sponsor: "Sponsor",
  treasure_pod: "Treasure Pod",
  ticket: "Ticket",
  ring: "Ring",
  other: "Other",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "var(--text-muted)" },
  confirmed: { label: "Confirmed", color: "#eab308" },
  awarded: { label: "Awarded", color: "#22c55e" },
};

const SHIPPING_LABELS: Record<string, { label: string; color: string }> = {
  not_applicable: { label: "Not Applicable", color: "var(--text-muted)" },
  pending: { label: "Pending", color: "#f59e0b" },
  shipped: { label: "Shipped", color: "#3b82f6" },
  delivered: { label: "Delivered", color: "#22c55e" },
};

interface PrizeDetailModalProps {
  prize: Prize | null;
  open: boolean;
  onClose: () => void;
  onEdit: (prize: Prize) => void;
  onDelete: (prize: Prize) => void;
}

export default function PrizeDetailModal({
  prize,
  open,
  onClose,
  onEdit,
  onDelete,
}: PrizeDetailModalProps) {
  if (!prize) return null;

  const statusInfo = STATUS_LABELS[prize.status] || STATUS_LABELS.planned;
  const shippingInfo = SHIPPING_LABELS[prize.shipping_status] || SHIPPING_LABELS.not_applicable;

  return (
    <Modal open={open} onClose={onClose} title={prize.name} maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Image */}
        <div
          className="w-full h-48 rounded-lg flex items-center justify-center overflow-hidden"
          style={{ background: "var(--bg-page)" }}
        >
          {prize.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={prize.image_url} alt={prize.name} className="w-full h-full object-contain" />
          ) : (
            <ImageIcon className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3">
          <DetailItem label="Category" value={CATEGORY_LABELS[prize.category] || prize.category} />
          <DetailItem label="Value" value={prize.value > 0 ? `€${prize.value.toFixed(2)}` : "—"} />
          <DetailItem label="Status">
            <span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
          </DetailItem>
          <DetailItem label="Recipient" value={prize.recipient_name} />
          <DetailItem label="Recipient Type" value={prize.recipient_type.replace("_", " ")} />
          {prize.placement && <DetailItem label="Placement" value={`#${prize.placement}`} />}
        </div>

        {/* Description */}
        {prize.description && (
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Description</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{prize.description}</p>
          </div>
        )}

        {/* Shipping info */}
        {prize.shipping_status !== "not_applicable" && (
          <div
            className="rounded-lg border p-3 space-y-2"
            style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Shipping
            </p>
            <div className="grid grid-cols-2 gap-2">
              <DetailItem label="Status">
                <span style={{ color: shippingInfo.color }}>{shippingInfo.label}</span>
              </DetailItem>
              {prize.tracking_number && (
                <DetailItem label="Tracking" value={prize.tracking_number} />
              )}
              {prize.shipping_date && (
                <DetailItem label="Shipped" value={prize.shipping_date} />
              )}
              {prize.delivery_date && (
                <DetailItem label="Delivered" value={prize.delivery_date} />
              )}
            </div>
            {prize.shipping_notes && (
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{prize.shipping_notes}</p>
            )}
          </div>
        )}

        {/* Linked transaction */}
        {prize.transaction_id && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <ExternalLink className="w-3 h-3" />
            <span>Linked to finance transaction</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => {
              onClose();
              onDelete(prize);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: "var(--error)" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(prize);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              color: "var(--accent)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DetailItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {children || (
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
      )}
    </div>
  );
}
