"use client";

import { useRef, useMemo } from "react";
import { TEMPLATES } from "./template-registry";
import ExportButton from "./shared/ExportButton";

import StreamLive from "./templates/StreamLive";
import PrizeAnnouncement from "./templates/PrizeAnnouncement";
import PrizePoolOverview from "./templates/PrizePoolOverview";
import SemiFinalWinner from "./templates/SemiFinalWinner";
import FinalsAnnouncement from "./templates/FinalsAnnouncement";
import MonthlyChampion from "./templates/MonthlyChampion";
import StandingsLeaderboard from "./templates/StandingsLeaderboard";
import SeasonRecap from "./templates/SeasonRecap";
import RegistrationOpen from "./templates/RegistrationOpen";
import MatchDayModern from "./templates/MatchDayModern";
import PlayerSpotlight from "./templates/PlayerSpotlight";
import ResultsDrop from "./templates/ResultsDrop";
import ResultsDrop2 from "./templates/ResultsDrop2";
import ResultsDropTop4 from "./templates/ResultsDropTop4";
import EventHype from "./templates/EventHype";

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

interface TemplatePreviewProps {
  templateId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  month: string;
}

export default function TemplatePreview({ templateId, data, month }: TemplatePreviewProps) {
  const fullSizeRef = useRef<HTMLDivElement>(null);

  const template = TEMPLATES.find((t) => t.id === templateId);
  const Component = COMPONENT_MAP[templateId];

  const templateData = useMemo(() => ({ ...data, month }), [data, month]);

  if (!template || !Component) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border h-96"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Select a template to preview
        </p>
      </div>
    );
  }

  const { width, height } = template.dimensions;
  const filename = `ecl-${templateId}-${month}`;

  // Responsive preview scaling
  const maxPreviewHeight = height > width ? 600 : 400;
  const scale = maxPreviewHeight / height;
  const previewWidth = width * scale;
  const previewHeight = maxPreviewHeight;

  return (
    <div className="space-y-4">
      {/* Dimension badge */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
        >
          {width} × {height}px
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Preview ({Math.round(scale * 100)}% scale)
        </span>
      </div>

      {/* Scaled preview */}
      <div
        className="rounded-xl border overflow-hidden mx-auto"
        style={{
          width: previewWidth,
          height: previewHeight,
          maxWidth: "100%",
          borderColor: "var(--border)",
          position: "relative",
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width,
            height,
          }}
        >
          <Component data={templateData} />
        </div>
      </div>

      {/* Export button */}
      <div className="flex justify-center">
        <ExportButton targetRef={fullSizeRef} filename={filename} />
      </div>

      {/* Off-screen full-size render for export — positioned off-screen, no clipping */}
      <div
        style={{
          position: "fixed",
          left: -9999,
          top: 0,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <div ref={fullSizeRef} id="figma-capture-target" style={{ width, height }}>
          <Component data={templateData} />
        </div>
      </div>
    </div>
  );
}
