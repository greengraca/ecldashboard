"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ChevronDown, ChevronUp, Shield, Send, Loader2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth } from "@/lib/utils";
import type { DragonShieldMonth } from "@/lib/types";
import DragonShieldCodes from "./dragon-shield-codes";
import DragonShieldFiles from "./dragon-shield-files";
import DragonShieldAddresses from "./dragon-shield-addresses";

interface DragonShieldTabProps {
  month: string;
  initialSection?: string;
}

interface SectionProps {
  title: string;
  progress?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, progress, defaultOpen = true, collapsible = true, headerAction, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;
  return (
    <div
      className="rounded-xl"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      {collapsible ? (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ color: "var(--text-primary)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            {progress && (
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                {progress}
              </span>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
        </button>
      ) : (
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</span>
            {progress && (
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                {progress}
              </span>
            )}
          </div>
          {headerAction}
        </div>
      )}
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

function getCodesProgress(dsData: DragonShieldMonth | null): string {
  const codes = dsData?.codes || [];
  if (codes.length === 0) return "(0/16)";
  const sent = codes.filter((c) => c.sent).length;
  return `(${sent}/${codes.length} sent)`;
}

function getFilesProgress(dsData: DragonShieldMonth | null): string {
  let done = 0;
  const total = 5; // 3 sleeve + 2 playmat
  if (dsData?.sleeve_files?.champion) done++;
  if (dsData?.sleeve_files?.top4) done++;
  if (dsData?.sleeve_files?.top16) done++;
  if (dsData?.playmat_files?.champion) done++;
  if (dsData?.playmat_files?.top4) done++;
  return `(${done}/${total})`;
}

function getAddressesProgress(dsData: DragonShieldMonth | null): string {
  const parts: string[] = [];
  if (dsData?.playmat_handoff) parts.push("handed off");
  return parts.length > 0 ? `(${parts.join(", ")})` : "";
}

export default function DragonShieldTab({ month, initialSection }: DragonShieldTabProps) {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, mutate } = useSWR<{ data: DragonShieldMonth | null }>(
    `/api/prizes/dragon-shield?month=${month}`,
    fetcher
  );

  const dsData = data?.data ?? null;
  const [markingAll, setMarkingAll] = useState(false);
  const refresh = () => {
    mutate();
    globalMutate(`/api/prizes/planning-status?month=${getCurrentMonth()}`);
  };

  const codes = dsData?.codes || [];
  const hasUnsent = codes.length > 0 && codes.some((c) => !c.sent);

  async function handleMarkAllSent() {
    setMarkingAll(true);
    try {
      await fetch(`/api/prizes/dragon-shield/codes/mark-all-sent?month=${month}`, { method: "POST" });
      refresh();
    } finally {
      setMarkingAll(false);
    }
  }

  const markAllButton = hasUnsent ? (
    <button
      onClick={handleMarkAllSent}
      disabled={markingAll}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors hover:brightness-125"
      style={{
        background: "rgba(251, 191, 36, 0.15)",
        color: "var(--accent)",
        border: "1px solid rgba(251, 191, 36, 0.35)",
        opacity: markingAll ? 0.5 : 1,
      }}
    >
      {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
      Mark All Sent
    </button>
  ) : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Dragon Shield — {new Date(month + "-01").toLocaleString("en-US", { month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="mb-4">
        <Section title="Files" progress={getFilesProgress(dsData)} defaultOpen={initialSection === "files"}>
          <DragonShieldFiles data={dsData} month={month} onRefresh={refresh} />
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Section title="Sleeve Codes" progress={getCodesProgress(dsData)} collapsible={false} headerAction={markAllButton}>
          <DragonShieldCodes data={dsData} month={month} onRefresh={refresh} />
        </Section>

        <Section title="Addresses & Handoff" progress={getAddressesProgress(dsData)} collapsible={false}>
          <DragonShieldAddresses data={dsData} month={month} onRefresh={refresh} />
        </Section>
      </div>
    </div>
  );
}
