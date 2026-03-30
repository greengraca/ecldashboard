"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";
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
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg mb-4" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ color: "var(--text-primary)" }}
      >
        <span className="text-sm font-semibold">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function DragonShieldTab({ month, initialSection }: DragonShieldTabProps) {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, mutate } = useSWR<{ data: DragonShieldMonth | null }>(
    `/api/prizes/dragon-shield?month=${month}`,
    fetcher
  );

  const dsData = data?.data ?? null;
  const refresh = () => {
    mutate();
    globalMutate(`/api/prizes/planning-status?month=${getCurrentMonth()}`);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Dragon Shield — {new Date(month + "-01").toLocaleString("en-US", { month: "long", year: "numeric" })}
        </span>
      </div>

      <Section title="Sleeve Codes" defaultOpen={initialSection === "codes" || !initialSection}>
        <DragonShieldCodes data={dsData} month={month} onRefresh={refresh} />
      </Section>

      <Section title="Files" defaultOpen={initialSection === "files"}>
        <DragonShieldFiles data={dsData} month={month} onRefresh={refresh} />
      </Section>

      <Section title="Addresses & Handoff" defaultOpen={initialSection === "addresses"}>
        <DragonShieldAddresses data={dsData} month={month} onRefresh={refresh} />
      </Section>
    </div>
  );
}
