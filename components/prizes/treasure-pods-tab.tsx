"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import TreasurePodMonitor from "./treasure-pod-monitor";
import TreasurePodConfig from "./treasure-pod-config";
import { getNextMonth } from "@/lib/utils";

interface TreasurePodsTabProps {
  month: string;
  showConfig?: boolean;
}

export default function TreasurePodsTab({ month, showConfig = false }: TreasurePodsTabProps) {
  const [configOpen, setConfigOpen] = useState(showConfig);
  const nextMonth = getNextMonth();
  const canConfigure = month >= nextMonth;

  return (
    <div>
      <TreasurePodMonitor month={month} />

      {canConfigure && (
        <div className="mt-6 rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="w-full flex items-center justify-between px-4 py-3"
            style={{ color: "var(--text-primary)" }}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span className="text-sm font-semibold">Pod Configuration</span>
            </div>
            {configOpen ? (
              <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            )}
          </button>
          {configOpen && (
            <div className="px-4 pb-4">
              <TreasurePodConfig month={month} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
