import type { ComponentType } from "react";
import { DIMENSIONS } from "./shared/brand-constants";

export interface TemplateDataField {
  key: string;
  label: string;
  type: "text" | "textarea" | "card" | "date" | "select" | "url" | "checkbox";
  options?: { value: string; label: string }[];
  /** Only show this field when the given data key is truthy */
  showIf?: string;
  /** Only show the input (keep label visible) when the given data key is truthy */
  inputShowIf?: string;
  /** Group fields with the same row value into a grid row in the editor */
  row?: string;
  /** Within a row, group fields with the same col value into a flex-col */
  col?: string;
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
  captionTemplate?: string;
}

// Templates are imported dynamically by TemplatePreview using the id.
// This registry only holds metadata — no component imports here to keep it light.
export const TEMPLATES: Omit<TemplateDefinition, "component">[] = [
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
    captionTemplate: "🏆 ECL {month} Season Recap\n\nChampion: {championName}\n🎮 {totalPlayers} players · {totalGames} games\n💰 {totalPrizeValue}€ in prizes\n\n#cEDH #EDH #MTG #ECL",
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
    captionTemplate: "📋 Registration is OPEN for ECL {month}!\n\n🔗 Link in bio\n⏰ Deadline: {deadline}\n\n#cEDH #EDH #MTG #ECL",
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
    captionTemplate: "🎮 MATCH DAY — ECL {month}\n\n{subtitle}\n📺 Stream: {streamUrl}\n⏰ {streamTime}\n\n#cEDH #EDH #MTG #ECL",
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
    captionTemplate: "⭐ {label} — {playerName}\n\nCommander: {commanderName}\n{stat1Label}: {stat1Value} · {stat2Label}: {stat2Value} · {stat3Label}: {stat3Value}\n\n#cEDH #EDH #MTG #ECL",
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
    captionTemplate: "📊 ECL {month} — Top 16 Standings\n\n🎮 {totalPlayers} players · {totalGames} games\n\nFull standings in the image 👆\n\n#cEDH #EDH #MTG #ECL",
  },
  {
    id: "results-drop-top4-v2",
    label: "Results Drop Top 4 v2 (Modern)",
    description: "Finals hype with 2×2 commander grid, golden yellow accents",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "nameOverrides", label: "Name Overrides", type: "checkbox" },
      { key: "player1", label: "Seat 1", type: "text", inputShowIf: "nameOverrides", row: "row1", col: "s1" },
      { key: "p1Commander", label: "Commander", type: "card", row: "row1", col: "s1" },
      { key: "hasP1Partner", label: "Partner", type: "checkbox", row: "row1", col: "s1" },
      { key: "p1Partner", label: "Partner Commander", type: "card", showIf: "hasP1Partner", row: "row1", col: "s1" },
      { key: "player2", label: "Seat 2", type: "text", inputShowIf: "nameOverrides", row: "row1", col: "s2" },
      { key: "p2Commander", label: "Commander", type: "card", row: "row1", col: "s2" },
      { key: "hasP2Partner", label: "Partner", type: "checkbox", row: "row1", col: "s2" },
      { key: "p2Partner", label: "Partner Commander", type: "card", showIf: "hasP2Partner", row: "row1", col: "s2" },
      { key: "player4", label: "Seat 4", type: "text", inputShowIf: "nameOverrides", row: "row2", col: "s4" },
      { key: "p4Commander", label: "Commander", type: "card", row: "row2", col: "s4" },
      { key: "hasP4Partner", label: "Partner", type: "checkbox", row: "row2", col: "s4" },
      { key: "p4Partner", label: "Partner Commander", type: "card", showIf: "hasP4Partner", row: "row2", col: "s4" },
      { key: "player3", label: "Seat 3", type: "text", inputShowIf: "nameOverrides", row: "row2", col: "s3" },
      { key: "p3Commander", label: "Commander", type: "card", row: "row2", col: "s3" },
      { key: "hasP3Partner", label: "Partner", type: "checkbox", row: "row2", col: "s3" },
      { key: "p3Partner", label: "Partner Commander", type: "card", showIf: "hasP3Partner", row: "row2", col: "s3" },
      { key: "streamDate", label: "Stream Date", type: "date" },
      { key: "streamTime", label: "Stream Time", type: "text" },
      { key: "sponsorText", label: "Sponsor Text", type: "text" },
    ],
    autoFillEndpoints: ["/api/players/brackets", "/api/players/standings"],
    captionTemplate: "🔥 ECL {month} — Finals Lineup!\n\n🏟️ The Top 4 are set. Who will take the crown?\n\n📺 Stream date coming soon\n\n#cEDH #EDH #MTG #ECL",
  },
  {
    id: "results-drop-winner",
    label: "Results Drop Winner (Modern)",
    description: "Champion spotlight with large winner commander, golden yellow accents",
    dimensions: DIMENSIONS.story,
    fields: [
      { key: "nameOverrides", label: "Name Overrides", type: "checkbox" },
      { key: "winner", label: "Winner", type: "text", inputShowIf: "nameOverrides", row: "row1", col: "w1" },
      { key: "winnerCommander", label: "Commander", type: "card", row: "row1", col: "w1" },
      { key: "hasWinnerPartner", label: "Partner", type: "checkbox", row: "row1", col: "w1" },
      { key: "winnerPartner", label: "Partner Commander", type: "card", showIf: "hasWinnerPartner", row: "row1", col: "w1" },
      { key: "second", label: "2nd Place", type: "text", inputShowIf: "nameOverrides", row: "row1", col: "w2" },
      { key: "secondCommander", label: "Commander", type: "card", row: "row1", col: "w2" },
      { key: "hasSecondPartner", label: "Partner", type: "checkbox", row: "row1", col: "w2" },
      { key: "secondPartner", label: "Partner Commander", type: "card", showIf: "hasSecondPartner", row: "row1", col: "w2" },
      { key: "third", label: "3rd Place", type: "text", inputShowIf: "nameOverrides", row: "row2", col: "w3" },
      { key: "thirdCommander", label: "Commander", type: "card", row: "row2", col: "w3" },
      { key: "hasThirdPartner", label: "Partner", type: "checkbox", row: "row2", col: "w3" },
      { key: "thirdPartner", label: "Partner Commander", type: "card", showIf: "hasThirdPartner", row: "row2", col: "w3" },
      { key: "fourth", label: "4th Place", type: "text", inputShowIf: "nameOverrides", row: "row2", col: "w4" },
      { key: "fourthCommander", label: "Commander", type: "card", row: "row2", col: "w4" },
      { key: "hasFourthPartner", label: "Partner", type: "checkbox", row: "row2", col: "w4" },
      { key: "fourthPartner", label: "Partner Commander", type: "card", showIf: "hasFourthPartner", row: "row2", col: "w4" },
      { key: "totalPlayers", label: "Total Players", type: "text", row: "stats" },
      { key: "totalGames", label: "Total Games", type: "text", row: "stats" },
      { key: "sponsorText", label: "Sponsor Text", type: "text" },
    ],
    autoFillEndpoints: ["/api/players/brackets", "/api/players/standings"],
    captionTemplate: "🏆 ECL {month} — We have a CHAMPION!\n\nCongratulations to {winner}! 🎉\n\n🎮 {totalPlayers} players · {totalGames} games\n\n#cEDH #EDH #MTG #ECL",
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
    captionTemplate: "🚀 {eventName}\n\n{description}\n\n📅 {eventDate} · ⏰ {eventTime}\n📺 {streamUrl}\n\n#cEDH #EDH #MTG #ECL",
  },
];
