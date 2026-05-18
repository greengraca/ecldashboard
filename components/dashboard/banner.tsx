"use client";

import { useState, type ReactNode } from "react";
import {
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type BannerVariant = "info" | "warning" | "error" | "success";

interface BannerProps {
  variant: BannerVariant;
  message: ReactNode;
  details?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const VARIANT_STYLES: Record<
  BannerVariant,
  { bg: string; border: string; color: string; icon: typeof Info }
> = {
  info: {
    bg: "rgba(96, 165, 250, 0.08)",
    border: "var(--info, #60a5fa)",
    color: "var(--info, #60a5fa)",
    icon: Info,
  },
  warning: {
    bg: "rgba(251, 191, 36, 0.08)",
    border: "var(--warning)",
    color: "var(--warning)",
    icon: AlertTriangle,
  },
  error: {
    bg: "var(--error-light)",
    border: "var(--error-border)",
    color: "var(--error)",
    icon: AlertCircle,
  },
  success: {
    bg: "var(--success-light)",
    border: "var(--success)",
    color: "var(--success)",
    icon: CheckCircle,
  },
};

export default function Banner({
  variant,
  message,
  details,
  dismissible,
  onDismiss,
}: BannerProps) {
  const style = VARIANT_STYLES[variant];
  const Icon = style.icon;
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!details;

  return (
    <div
      className="rounded-lg text-xs"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1">{message}</span>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {hasDetails && expanded && (
        <div
          className="px-4 pb-2.5 pt-2"
          style={{ borderTop: `1px solid ${style.border}` }}
        >
          {details}
        </div>
      )}
    </div>
  );
}
