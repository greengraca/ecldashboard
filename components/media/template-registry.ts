import type { ComponentType } from "react";
import { DIMENSIONS } from "./shared/brand-constants";

export interface TemplateDataField {
  key: string;
  label: string;
  type: "text" | "textarea" | "card" | "date" | "select" | "url" | "checkbox";
  options?: { value: string; label: string }[];
  /** Only show this field when the given data key is truthy */
  showIf?: string;
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
      { key: "hasPartner", label: "Partner Commanders", type: "checkbox" },
      { key: "partnerName", label: "Partner Commander", type: "card", showIf: "hasPartner" },
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
      { key: "hasPartner1", label: "P1 Partner", type: "checkbox" },
      { key: "partner1", label: "P1 Partner Commander", type: "card", showIf: "hasPartner1" },
      { key: "commander2", label: "Player 2 Commander", type: "card" },
      { key: "hasPartner2", label: "P2 Partner", type: "checkbox" },
      { key: "partner2", label: "P2 Partner Commander", type: "card", showIf: "hasPartner2" },
      { key: "commander3", label: "Player 3 Commander", type: "card" },
      { key: "hasPartner3", label: "P3 Partner", type: "checkbox" },
      { key: "partner3", label: "P3 Partner Commander", type: "card", showIf: "hasPartner3" },
      { key: "commander4", label: "Player 4 Commander", type: "card" },
      { key: "hasPartner4", label: "P4 Partner", type: "checkbox" },
      { key: "partner4", label: "P4 Partner Commander", type: "card", showIf: "hasPartner4" },
      { key: "streamDate", label: "Stream Date", type: "date" },
      { key: "streamTime", label: "Stream Time", type: "text" },
    ],
    autoFillEndpoints: ["/api/players/brackets", "/api/discord/members"],
  },
  {
    id: "monthly-champion",
    label: "Monthly Champion",
    description: "Champion spotlight with commander card and stats",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "playerName", label: "Champion Name", type: "text" },
      { key: "commanderName", label: "Commander", type: "card" },
      { key: "hasPartner", label: "Partner Commanders", type: "checkbox" },
      { key: "partnerName", label: "Partner Commander", type: "card", showIf: "hasPartner" },
      { key: "deckName", label: "Deck Name (optional)", type: "text" },
      { key: "gamesPlayed", label: "Games Played", type: "text" },
      { key: "winRate", label: "OW% (number only)", type: "text" },
      { key: "quote", label: "Champion Quote (optional)", type: "textarea" },
    ],
  },
  {
    id: "standings-leaderboard",
    label: "Standings Leaderboard",
    description: "Top 16 standings table (9:16 story)",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "title", label: "Title Override", type: "text" },
      {
        key: "showCount",
        label: "Show Top N",
        type: "select",
        options: [
          { value: "8", label: "Top 8" },
          { value: "10", label: "Top 10" },
          { value: "16", label: "Top 16" },
        ],
      },
    ],
    autoFillEndpoints: ["/api/players/standings"],
  },
  {
    id: "season-recap",
    label: "Season Recap",
    description: "Monthly stats overview (1:1 feed post)",
    dimensions: DIMENSIONS.feed,
    fields: [
      { key: "championName", label: "Champion Name", type: "text" },
      { key: "topCommander", label: "Top Commander", type: "text" },
      { key: "totalPlayers", label: "Total Players", type: "text" },
      { key: "totalGames", label: "Total Games", type: "text" },
      { key: "avgGamesPerPlayer", label: "Avg Games/Player", type: "text" },
      { key: "totalPrizeValue", label: "Total Prize Value (€)", type: "text" },
      { key: "customStat1Label", label: "Custom Stat 1 Label", type: "text" },
      { key: "customStat1Value", label: "Custom Stat 1 Value", type: "text" },
      { key: "customStat2Label", label: "Custom Stat 2 Label", type: "text" },
      { key: "customStat2Value", label: "Custom Stat 2 Value", type: "text" },
    ],
  },
  {
    id: "registration-open",
    label: "Registration Open",
    description: "Sign-up announcement with deadline and link",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "tagline", label: "Tagline (optional)", type: "text" },
      { key: "registrationUrl", label: "Registration URL", type: "url" },
      { key: "deadline", label: "Registration Deadline", type: "date" },
      { key: "spotsLeft", label: "Spots Left (optional)", type: "text" },
    ],
  },
  // ── Modern / off-brand templates ─────────────────────────────
  {
    id: "match-day-modern",
    label: "Match Day (Modern)",
    description: "Oversized bold typography, violet gradient, geometric grid",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "subtitle", label: "Subtitle / Tagline", type: "text" },
      { key: "streamUrl", label: "Stream URL", type: "url" },
      { key: "streamTime", label: "Stream Time", type: "text" },
    ],
  },
  {
    id: "player-spotlight",
    label: "Player Spotlight (Modern)",
    description: "Monochromatic teal split layout with bold type (1:1)",
    dimensions: DIMENSIONS.feed,
    fields: [
      {
        key: "label",
        label: "Badge Label",
        type: "select",
        options: [
          { value: "PLAYER SPOTLIGHT", label: "Player Spotlight" },
          { value: "CHAMPION", label: "Champion" },
          { value: "MVP", label: "MVP" },
          { value: "MOST GAMES", label: "Most Games" },
        ],
      },
      { key: "playerName", label: "Player Name", type: "text" },
      { key: "commanderName", label: "Commander", type: "card" },
      { key: "hasPartner", label: "Partner Commanders", type: "checkbox" },
      { key: "partnerName", label: "Partner Commander", type: "card", showIf: "hasPartner" },
      { key: "stat1Label", label: "Stat 1 Label", type: "text" },
      { key: "stat1Value", label: "Stat 1 Value", type: "text" },
      { key: "stat2Label", label: "Stat 2 Label", type: "text" },
      { key: "stat2Value", label: "Stat 2 Value", type: "text" },
      { key: "stat3Label", label: "Stat 3 Label", type: "text" },
      { key: "stat3Value", label: "Stat 3 Value", type: "text" },
    ],
  },
  {
    id: "results-drop",
    label: "Results Drop Top 16 (Modern)",
    description: "Brutalist leaderboard with neon lime accents, Top 16 cut",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "title", label: "Title Override", type: "text" },
      { key: "totalPlayers", label: "Total Players", type: "text" },
      { key: "totalGames", label: "Total Games", type: "text" },
    ],
    autoFillEndpoints: ["/api/players/standings"],
  },
  {
    id: "results-drop-2",
    label: "Results Drop Top 16 v2 (Modern)",
    description: "Brutalist leaderboard with ECL logo footer and sponsor line",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "title", label: "Title Override", type: "text" },
      { key: "totalPlayers", label: "Total Players", type: "text" },
      { key: "totalGames", label: "Total Games", type: "text" },
      { key: "sponsorText", label: "Sponsor Text", type: "text" },
    ],
    autoFillEndpoints: ["/api/players/standings"],
  },
  {
    id: "results-drop-top4",
    label: "Results Drop Top 4 (Modern)",
    description: "Brutalist layout with neon lime accents, Top 4 finals results",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "winner", label: "1st Place", type: "text" },
      { key: "winnerCommander", label: "Winner's Commander", type: "card" },
      { key: "second", label: "2nd Place", type: "text" },
      { key: "third", label: "3rd Place", type: "text" },
      { key: "fourth", label: "4th Place", type: "text" },
      { key: "totalPlayers", label: "Total Players", type: "text" },
      { key: "totalGames", label: "Total Games", type: "text" },
    ],
    autoFillEndpoints: ["/api/players/brackets", "/api/players/standings"],
  },
  {
    id: "event-hype",
    label: "Event Hype (Modern)",
    description: "Sci-fi inspired with orbital rings and cyan neon glow",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "eventName", label: "Event Name", type: "text" },
      {
        key: "highlight",
        label: "Highlight Tag",
        type: "select",
        options: [
          { value: "UPCOMING", label: "Upcoming" },
          { value: "FINALS", label: "Finals" },
          { value: "SEMI-FINALS", label: "Semi-Finals" },
          { value: "SEASON OPENER", label: "Season Opener" },
          { value: "SPECIAL EVENT", label: "Special Event" },
        ],
      },
      { key: "description", label: "Description", type: "textarea" },
      { key: "eventDate", label: "Event Date", type: "date" },
      { key: "eventTime", label: "Event Time", type: "text" },
      { key: "streamUrl", label: "Stream URL", type: "url" },
    ],
  },
];
