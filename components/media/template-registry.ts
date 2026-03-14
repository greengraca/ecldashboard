import type { ComponentType } from "react";
import { DIMENSIONS } from "./shared/brand-constants";

export interface TemplateDataField {
  key: string;
  label: string;
  type: "text" | "textarea" | "card" | "date" | "select" | "url";
  options?: { value: string; label: string }[];
}

export interface TemplateDefinition {
  id: string;
  label: string;
  description: string;
  dimensions: { width: number; height: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<{ data: Record<string, any> }>;
  fields: TemplateDataField[];
  autoFillEndpoints?: string[];
}

// Templates are imported dynamically by TemplatePreview using the id.
// This registry only holds metadata — no component imports here to keep it light.
export const TEMPLATES: Omit<TemplateDefinition, "component">[] = [
  {
    id: "stream-live",
    label: "Stream Live",
    description: "LIVE NOW announcement with stream link",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "streamUrl", label: "Stream URL", type: "url" },
    ],
  },
  {
    id: "prize-announcement",
    label: "Prize Announcement",
    description: "Monthly prize announcement (9:16 story)",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "title", label: "Title Override", type: "text" },
    ],
    autoFillEndpoints: ["/api/prizes"],
  },
  {
    id: "prize-pool-overview",
    label: "Prize Pool Overview",
    description: "Condensed prize pool (1:1 feed post)",
    dimensions: DIMENSIONS.feed,
    fields: [
      { key: "title", label: "Title Override", type: "text" },
    ],
    autoFillEndpoints: ["/api/prizes"],
  },
  {
    id: "semi-final-winner",
    label: "Semi-Final Winner",
    description: "Pod semi-final results with player avatars",
    dimensions: DIMENSIONS.story,
    fields: [
      {
        key: "pod",
        label: "Pod",
        type: "select",
        options: [
          { value: "1", label: "Pod 1" },
          { value: "2", label: "Pod 2" },
          { value: "3", label: "Pod 3" },
          { value: "4", label: "Pod 4" },
        ],
      },
      { key: "commanderName", label: "Winner's Commander", type: "card" },
      { key: "deckName", label: "Deck Name (optional)", type: "text" },
    ],
    autoFillEndpoints: ["/api/players/brackets", "/api/discord/members"],
  },
  {
    id: "finals-announcement",
    label: "Finals Announcement",
    description: "Top 4 finals with commanders and stream date",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "commander1", label: "Player 1 Commander", type: "card" },
      { key: "commander2", label: "Player 2 Commander", type: "card" },
      { key: "commander3", label: "Player 3 Commander", type: "card" },
      { key: "commander4", label: "Player 4 Commander", type: "card" },
      { key: "streamDate", label: "Stream Date", type: "date" },
      { key: "streamTime", label: "Stream Time", type: "text" },
    ],
    autoFillEndpoints: ["/api/players/brackets", "/api/discord/members"],
  },
];
