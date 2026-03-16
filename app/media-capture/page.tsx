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
import MonthlyChampion from "@/components/media/templates/MonthlyChampion";
import StandingsLeaderboard from "@/components/media/templates/StandingsLeaderboard";
import SeasonRecap from "@/components/media/templates/SeasonRecap";
import RegistrationOpen from "@/components/media/templates/RegistrationOpen";
import MatchDayModern from "@/components/media/templates/MatchDayModern";
import PlayerSpotlight from "@/components/media/templates/PlayerSpotlight";
import ResultsDrop from "@/components/media/templates/ResultsDrop";
import ResultsDrop2 from "@/components/media/templates/ResultsDrop2";
import ResultsDropTop4 from "@/components/media/templates/ResultsDropTop4";
import EventHype from "@/components/media/templates/EventHype";
import { TEMPLATES } from "@/components/media/template-registry";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENT_MAP: Record<string, React.ComponentType<{ data: any }>> = {
  "stream-live": StreamLive,
  "prize-announcement": PrizeAnnouncement,
  "prize-pool-overview": PrizePoolOverview,
  "semi-final-winner": SemiFinalWinner,
  "finals-announcement": FinalsAnnouncement,
  "monthly-champion": MonthlyChampion,
  "standings-leaderboard": StandingsLeaderboard,
  "season-recap": SeasonRecap,
  "registration-open": RegistrationOpen,
  "match-day-modern": MatchDayModern,
  "player-spotlight": PlayerSpotlight,
  "results-drop": ResultsDrop,
  "results-drop-2": ResultsDrop2,
  "results-drop-top4": ResultsDropTop4,
  "event-hype": EventHype,
};

const PRIZE_TEMPLATES = new Set(["prize-announcement", "prize-pool-overview"]);
const BRACKET_TEMPLATES = new Set(["semi-final-winner", "finals-announcement", "results-drop-top4"]);
const STANDINGS_TEMPLATES = new Set(["results-drop", "results-drop-2", "results-drop-top4"]);

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
  const needsStandings = STANDINGS_TEMPLATES.has(templateId);

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
  const { data: standingsRes } = useSWR(
    needsStandings ? `/api/players/standings?month=${month}` : null,
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
