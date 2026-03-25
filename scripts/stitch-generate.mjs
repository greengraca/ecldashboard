/**
 * Generate ECL media template variants using Google Stitch SDK.
 *
 * Usage:
 *   node --env-file=.env.local scripts/stitch-generate.mjs
 *   node --env-file=.env.local scripts/stitch-generate.mjs --only finals
 *   node --env-file=.env.local scripts/stitch-generate.mjs --only top16
 *
 * Downloads screenshots + HTML to scripts/stitch-output/ for review.
 */

import { StitchToolClient } from "@google/stitch-sdk";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "stitch-output");

// ── Brand context shared across all prompts ──────────────────────────
const BRAND_CONTEXT = `
Brand: European cEDH League (ECL) — a competitive Magic: The Gathering Commander league.
Format: Instagram story (1080×1920 pixels, 9:16 vertical).
Visual identity: Premium dark esports aesthetic. Near-black backgrounds (#0a0a14).
Gold accent color (#D4A017). White text on dark. Cinzel serif font for headings.
The ECL logo should appear at the top. Subtle noise/grain texture overlay for depth.
The design should feel like a luxury esports broadcast graphic — bold, clean, high contrast.
Do NOT use stock photos. Use geometric shapes, gradients, glows, and abstract elements only.
`.trim();

// ── Finals (Top 4) prompts — 5 distinct creative directions ─────────
const FINALS_PROMPTS = [
  `${BRAND_CONTEXT}\n\nDesign a FINALS ANNOUNCEMENT for Top 4 players. CINEMATIC SPOTLIGHT direction: dramatic golden spotlights through dark smoke. Large "FINALS" metallic gold title. 2×2 grid of player cards with: player name (bold white), commander name (gold), card art placeholder (dark rectangle, gold border). Bottom: stream date, time, "LIVE ON TWITCH" badge. ECL logo footer. Diagonal gold light beams in background.`,

  `${BRAND_CONTEXT}\n\nDesign a FINALS ANNOUNCEMENT for Top 4 players. NEON BRUTALIST direction: raw, aggressive oversized "FINALS" text bleeding off edges. Player names in massive bold sans-serif stacked vertically. Commander names smaller, offset right. Deep black background with single electric gold accent stripe cutting diagonally. Sharp, angular, no rounded corners. Stream info in monospace at bottom.`,

  `${BRAND_CONTEXT}\n\nDesign a FINALS ANNOUNCEMENT for Top 4 players. CHAMPIONSHIP CEREMONY direction: large ornate golden circular emblem/crest with "FINALS" inscribed. 4 players arranged around the emblem. Player name + commander in elegant serif. Gold decorative borders and filigree. Navy-to-black gradient background with subtle star particles. Date and stream info at bottom. Royal, prestigious feel.`,

  `${BRAND_CONTEXT}\n\nDesign a FINALS ANNOUNCEMENT for Top 4 players. DIGITAL GLITCH direction: cyberpunk scan lines, pixel distortion, data visualization. "FINALS" in glitched text with gold-tinted RGB split. Player cards in staggered vertical list, thin gold borders, monospace labels, commander in accent color. Dark background with circuit board patterns and horizontal scan lines. Stream info as terminal/HUD readout.`,

  `${BRAND_CONTEXT}\n\nDesign a FINALS ANNOUNCEMENT for Top 4 players. MINIMALIST LUXURY direction: ultra-clean, negative space, whisper-quiet elegance. "FINALS" in thin uppercase tracking-wide serif, gold on black. 4 player entries with generous spacing: thin gold horizontal line, player name (white) and commander (muted gold). No boxes or cards — just typography and lines. Subtle gold gradient glow behind center. Date and ECL logo very small at bottom.`,
];

// ── Top 16 prompts — 5 distinct creative directions ─────────────────
const TOP16_PROMPTS = [
  `${BRAND_CONTEXT}\n\nDesign a TOP 16 LEADERBOARD for 16 ranked players. BROADCAST SCOREBOARD direction: like a live esports broadcast overlay. "TOP 16 STANDINGS" header with month label and ECL logo. 16 numbered rows: rank (large, gold for top 3), player name (white bold), commander (muted), points (right-aligned, gold). Top 3 rows with gold glow background. Thin gold row separators. Stats bar at bottom: "XX players · XX games". Professional broadcast feel.`,

  `${BRAND_CONTEXT}\n\nDesign a TOP 16 LEADERBOARD. TIER LIST direction: group players into visual tiers. Ranks 1-4 in large cards with gold borders. Ranks 5-8 in medium cards, lighter borders. Ranks 9-16 in compact rows. Each entry: rank, player name, commander, points. Background gradient from dark gold-tinted at top to pure black at bottom. "TOP 16" bold at top, stats at bottom.`,

  `${BRAND_CONTEXT}\n\nDesign a TOP 16 LEADERBOARD. BRUTALIST TYPOGRAPHY direction: rank numbers are MASSIVE (oversized, partially cropped), player names overlapping in contrasting weight. Editorial magazine layout. Numbers in heavy condensed font, dark gold. Names in clean white sans-serif layered on top. Points in monospace, right-aligned. Thick gold vertical line on left edge. Stats at bottom in small caps.`,

  `${BRAND_CONTEXT}\n\nDesign a TOP 16 LEADERBOARD. TRADING CARD direction: each player entry looks like a miniature game card. 16 small horizontal cards stacked with slight overlap. Dark background, thin gold border per card. Rank badge on left (circular, gold for top 3), player name centered, commander smaller below, points on right. #1 card slightly larger with crown emblem. Hexagonal background pattern. "TOP 16" header in ornate style.`,

  `${BRAND_CONTEXT}\n\nDesign a TOP 16 LEADERBOARD. DATA DASHBOARD direction: high-end analytics look. "TOP 16" header with subtle line chart silhouette. Player rows with horizontal bar chart showing relative points (gold filled bars). Top 3 bars gold, rest muted. Points as numbers on right. Stats at bottom in pill/chip badges: "total players", "total games". Subtle grid lines. Modern, analytical, sleek.`,
];

// ── Helpers ──────────────────────────────────────────────────────────

async function downloadFile(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  await writeFile(filepath, Buffer.from(await res.arrayBuffer()));
}

function extractScreen(raw) {
  // Find the outputComponent that has a .design property with screens
  for (const comp of raw.outputComponents || []) {
    if (comp.design?.screens?.length > 0) {
      return comp.design.screens[0];
    }
  }
  return null;
}

async function generateOne(client, projectId, tag, prompt) {
  console.log(`\n🎨 Generating ${tag}...`);
  const start = Date.now();

  try {
    const raw = await client.callTool("generate_screen_from_text", {
      projectId,
      prompt,
      deviceType: "MOBILE",
      modelId: "GEMINI_3_PRO",
    });

    const screen = extractScreen(raw);
    if (!screen) {
      console.error(`  ✗ ${tag}: no screen in response`);
      return null;
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  Generated in ${elapsed}s — screen: ${screen.id}`);

    // Download screenshot
    if (screen.screenshot?.downloadUrl) {
      const imgPath = join(OUTPUT_DIR, `${tag}.png`);
      await downloadFile(screen.screenshot.downloadUrl, imgPath);
      console.log(`  ✓ ${tag}.png`);
    }

    // Download HTML
    if (screen.htmlCode?.downloadUrl) {
      const htmlPath = join(OUTPUT_DIR, `${tag}.html`);
      await downloadFile(screen.htmlCode.downloadUrl, htmlPath);
      console.log(`  ✓ ${tag}.html`);
    }

    return { tag, screenId: screen.id };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`  ✗ ${tag} failed after ${elapsed}s: ${err.message}`);
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.STITCH_API_KEY) {
    console.error("Error: STITCH_API_KEY not set. Get one from https://stitch.withgoogle.com/");
    process.exit(1);
  }

  const only = process.argv.find((_, i, a) => a[i - 1] === "--only");

  await mkdir(OUTPUT_DIR, { recursive: true });

  const client = new StitchToolClient({
    apiKey: process.env.STITCH_API_KEY,
    timeout: 600_000,
  });

  console.log("🏗️  Creating Stitch project: ECL Media Templates...");
  const projectRaw = await client.callTool("create_project", {
    title: "ECL Media Templates",
  });
  const projectId = projectRaw.name.replace("projects/", "");
  console.log(`   Project ID: ${projectId}`);

  const results = [];

  if (!only || only === "finals") {
    console.log("\n═══ FINALS (Top 4) Templates ═══");
    for (let i = 0; i < FINALS_PROMPTS.length; i++) {
      const r = await generateOne(client, projectId, `finals-v${i + 1}`, FINALS_PROMPTS[i]);
      results.push(r);
    }
  }

  if (!only || only === "top16") {
    console.log("\n═══ TOP 16 Standings Templates ═══");
    for (let i = 0; i < TOP16_PROMPTS.length; i++) {
      const r = await generateOne(client, projectId, `top16-v${i + 1}`, TOP16_PROMPTS[i]);
      results.push(r);
    }
  }

  // Summary
  const ok = results.filter(Boolean).length;
  const fail = results.filter((r) => !r).length;
  console.log(`\n══════════════════════════════════`);
  console.log(`📋 DONE: ${ok} succeeded, ${fail} failed`);
  console.log(`   Project: ${projectId}`);
  console.log(`   Output:  ${OUTPUT_DIR}`);
  console.log(`   Web:     https://stitch.withgoogle.com/`);
  console.log(`══════════════════════════════════`);

  await client.close();
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
