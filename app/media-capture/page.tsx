"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";

import dynamic from "next/dynamic";
import { TEMPLATES } from "@/components/media/template-registry";
import { fetcher } from "@/lib/fetcher";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENT_MAP: Record<string, React.ComponentType<{ data: any }>> = {
  "season-recap": dynamic(() => import("@/components/media/templates/SeasonRecap")),
  "registration-open": dynamic(() => import("@/components/media/templates/RegistrationOpen")),
  "match-day-modern": dynamic(() => import("@/components/media/templates/MatchDayModern")),
  "player-spotlight": dynamic(() => import("@/components/media/templates/PlayerSpotlight")),
  "results-drop-2": dynamic(() => import("@/components/media/templates/ResultsDrop2")),
  "results-drop-top4-v2": dynamic(() => import("@/components/media/templates/ResultsDropTop4v2")),
  "results-drop-winner": dynamic(() => import("@/components/media/templates/ResultsDropWinner")),
  "event-hype": dynamic(() => import("@/components/media/templates/EventHype")),
};

const PRIZE_TEMPLATES = new Set<string>([]);
const BRACKET_TEMPLATES = new Set(["results-drop-top4-v2", "results-drop-winner"]);
const STANDINGS_TEMPLATES = new Set(["results-drop-2", "results-drop-top4-v2", "results-drop-winner"]);

/**
 * Standalone capture page — renders a single template at full resolution
 * with no dashboard chrome. Used for Figma export.
 *
 * URL: /media/capture?template=season-recap&month=2026-03
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
  const needsStandings = STANDINGS_TEMPLATES.has(templateId);

  const { data: prizesRes } = useSWR(
    needsPrizes ? `/api/prizes?month=${month}` : null,
    fetcher
  );
  const { data: standingsRes } = useSWR(
    needsStandings ? `/api/players/standings?month=${month}` : null,
    fetcher
  );
  const bracketsMonth = (needsStandings && standingsRes?.data?.month) || month;
  const { data: bracketsRes } = useSWR(
    needsBrackets ? `/api/players/brackets?month=${bracketsMonth}` : null,
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
    if (needsStandings && standingsRes?.data) d.standings = standingsRes.data;
    return d;
  }, [month, needsPrizes, prizesRes, needsBrackets, bracketsRes, membersRes, needsStandings, standingsRes]);

  if (!template || !Component) {
    return (
      <div style={{ padding: 40, color: "#fff", fontFamily: "sans-serif" }}>
        <h1>Missing template</h1>
        <p>Use <code>?template=season-recap&month=2026-03</code></p>
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
