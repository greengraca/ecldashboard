"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";

import StreamLive from "@/components/media/templates/StreamLive";
import PrizeAnnouncement from "@/components/media/templates/PrizeAnnouncement";
import PrizePoolOverview from "@/components/media/templates/PrizePoolOverview";
import SemiFinalWinner from "@/components/media/templates/SemiFinalWinner";
import FinalsAnnouncement from "@/components/media/templates/FinalsAnnouncement";
import { TEMPLATES } from "@/components/media/template-registry";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENT_MAP: Record<string, React.ComponentType<{ data: any }>> = {
  "stream-live": StreamLive,
  "prize-announcement": PrizeAnnouncement,
  "prize-pool-overview": PrizePoolOverview,
  "semi-final-winner": SemiFinalWinner,
  "finals-announcement": FinalsAnnouncement,
};

const PRIZE_TEMPLATES = new Set(["prize-announcement", "prize-pool-overview"]);
const BRACKET_TEMPLATES = new Set(["semi-final-winner", "finals-announcement"]);

/**
 * Standalone capture page — renders a single template at full resolution
 * with no dashboard chrome. Used for Figma export.
 *
 * URL: /media/capture?template=stream-live&month=2026-03
 */
export default function CapturePage() {
  return (
    <Suspense fallback={<div style={{ color: "#fff", padding: 40 }}>Loading...</div>}>
      <CaptureContent />
    </Suspense>
  );
}

function CaptureContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template") || "";
  const month = searchParams.get("month") || "";

  const template = TEMPLATES.find((t) => t.id === templateId);
  const Component = COMPONENT_MAP[templateId];

  const needsPrizes = PRIZE_TEMPLATES.has(templateId);
  const needsBrackets = BRACKET_TEMPLATES.has(templateId);

  const { data: prizesRes } = useSWR(
    needsPrizes ? `/api/prizes?month=${month}` : null,
    fetcher
  );
  const { data: bracketsRes } = useSWR(
    needsBrackets ? `/api/players/brackets?month=${month}` : null,
    fetcher
  );
  const { data: membersRes } = useSWR(
    needsBrackets ? "/api/discord/members" : null,
    fetcher
  );

  const templateData = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: Record<string, any> = { month };
    if (needsPrizes && prizesRes?.data) d.prizes = prizesRes.data;
    if (needsBrackets && bracketsRes?.data) d.brackets = bracketsRes.data;
    if (needsBrackets && membersRes?.data) d.members = membersRes.data;
    return d;
  }, [month, needsPrizes, prizesRes, needsBrackets, bracketsRes, membersRes]);

  if (!template || !Component) {
    return (
      <div style={{ padding: 40, color: "#fff", fontFamily: "sans-serif" }}>
        <h1>Missing template</h1>
        <p>Use <code>?template=stream-live&month=2026-03</code></p>
        <p>Available: {Object.keys(COMPONENT_MAP).join(", ")}</p>
      </div>
    );
  }

  const { width, height } = template.dimensions;

  return (
    <div
      id="figma-capture-target"
      style={{ width, height, margin: 0, padding: 0 }}
    >
      <Component data={templateData} />
    </div>
  );
}
