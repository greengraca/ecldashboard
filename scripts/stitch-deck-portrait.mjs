/**
 * Deck carousel in inspired style, 1080×1350 (4:5 Instagram portrait post).
 *
 * Usage: node --env-file=.env.local scripts/stitch-deck-portrait.mjs
 */

import { StitchToolClient } from "@google/stitch-sdk";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "stitch-output", "deck-portrait");

const DIMENSIONS = `The design MUST be exactly 1080 pixels wide × 1350 pixels tall (4:5 portrait Instagram post format).`;

const STYLE = `Visual style: premium Magic: The Gathering content creator editorial.
- Background: full-bleed dark teal/blue-green fantasy artwork (mystical forests, underwater ruins, or arcane landscapes). The art covers the entire background with a 50-60% dark overlay for text readability.
- Typography: large bold gold/yellow serif font (#D4A517) for headings. White for body text. Gold italic for section labels and CTAs.
- League logo badge placeholder in top-right corner (hexagonal with gold border).
- Magazine / interview Q&A format — headings are bold gold questions, body text is quoted player answers in white.
- Gold arrow navigation cues.
- MTG card placeholders: dark rounded rectangles with thin gold borders, slightly overlapping and rotated like fanned-out cards.
- Feel: atmospheric, immersive, premium gaming magazine spread. Dark and moody.`;

const PAGES = [
  { tag: "cover", prompt: `${DIMENSIONS}

${STYLE}

Design the COVER PAGE (page 1 of 4) of an Instagram carousel presenting a champion's winning deck from a competitive Magic: The Gathering league.
Layout — use the full 1080×1350 space:
- Full-bleed dark teal fantasy artwork background with dark overlay
- Top area: "EUROPEAN CEDH LEAGUE" in large bold gold serif, stacked across 3 lines, taking up roughly the top third
- Top-right: league logo badge placeholder
- Middle: "The [Month] European League Champion is here!" in white, followed by gold italic "Winning with [strategy] in cEDH"
- Lower third: HUGE bold gold serif commander/deck name (e.g. "THE WANDERING MINSTREL") — this should be the visual hero
- Below: white italic "The secrets behind one of the most difficult decks to pilot"
- Bottom-right: gold "Swipe right to know more →" with arrow
- Generous vertical spacing — take advantage of the tall format` },

  { tag: "why-play", prompt: `${DIMENSIONS}

${STYLE}

Design PAGE 2 of 4 of a champion's deck Instagram carousel.
"Why Play This Deck?" page. Use the full 1080×1350 vertical space.
Layout:
- Full-bleed dark teal fantasy art background with overlay
- Top: large bold gold serif "WHY PLAY [COMMANDER]?" taking ~20% of the height
- Top-right: league logo badge
- Upper body: white quoted text block (3-4 sentences in quotation marks) explaining what the commander does and why it's strong
- Mid section: gold serif subheading "PLAYSTYLE OF THE LIST"
- Lower body: white quoted text (3-4 sentences) about the deck's playstyle — turbo, midrange, control, combo etc.
- Bottom: gold "Main Plan & Card Choices →" with gold arrow
- Good vertical spacing between all sections` },

  { tag: "main-plan", prompt: `${DIMENSIONS}

${STYLE}

Design PAGE 3 of 4 of a champion's deck Instagram carousel.
"Main Plan" page. Use the full 1080×1350 vertical space.
Layout:
- Full-bleed dark teal fantasy art background with overlay
- Top: large bold gold serif "MAIN PLAN"
- Top-right: league logo badge
- Upper section: 3 MTG card images fanned out (overlapping dark rounded rectangles with thin gold borders, center card slightly raised, ~15° rotation on outer cards). Cards should be prominent, roughly 30% of the height.
- Below cards: white quoted text explaining the deck's main win conditions, combos, and key lines (4-5 sentences, with occasional bold gold keywords for emphasis)
- Lower section: bold gold serif "HOW HAS IT BEEN PLAYING IN ECL?"
- Below: white quoted text about the player's experience in the league (2-3 sentences)
- Bottom: gold "Join our league, link in bio"` },

  { tag: "card-choices", prompt: `${DIMENSIONS}

${STYLE}

Design PAGE 4 of 4 (final page) of a champion's deck Instagram carousel.
"Card Choices" page. Use the full 1080×1350 vertical space.
Layout:
- Full-bleed dark navy/teal fantasy art background (slightly different shade) with overlay
- Top: large bold gold serif "CARD CHOICES"
- Top-right: league logo badge
- Upper section: 4-5 MTG card images in a row (overlapping dark rounded rectangles with gold borders, fanned). Prominent, ~25% height.
- Middle: white quoted text explaining unique/tech card choices and deck philosophy (4-5 sentences with bold gold keywords)
- Lower section: bold gold serif "WHAT INSPIRED YOU TO BUILD THE DECK?"
- Below: white quoted text about the player's inspiration for building the deck (3-4 sentences)
- Bottom: gold "Decklist in the description ↓" with downward arrow
- Atmospheric, editorial closing page` },
];

// ── Helpers ──────────────────────────────────────────────────────────

function extractScreen(raw) {
  for (const comp of raw.outputComponents || []) {
    if (comp.design?.screens?.length > 0) return comp.design.screens[0];
  }
  return null;
}

async function downloadFile(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  await writeFile(filepath, Buffer.from(await res.arrayBuffer()));
}

async function generateOne(client, projectId, tag, prompt) {
  console.log(`\n🎨 Generating ${tag}...`);
  const start = Date.now();
  try {
    const raw = await client.callTool("generate_screen_from_text", {
      projectId, prompt, deviceType: "MOBILE", modelId: "GEMINI_3_PRO",
    });
    const screen = extractScreen(raw);
    if (!screen) { console.error(`  ✗ ${tag}: no screen`); return null; }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  Done in ${elapsed}s — screen: ${screen.id}`);
    if (screen.screenshot?.downloadUrl) {
      await downloadFile(screen.screenshot.downloadUrl, join(OUTPUT_DIR, `${tag}.png`));
      console.log(`  ✓ ${tag}.png`);
    }
    if (screen.htmlCode?.downloadUrl) {
      await downloadFile(screen.htmlCode.downloadUrl, join(OUTPUT_DIR, `${tag}.html`));
      console.log(`  ✓ ${tag}.html`);
    }
    return { tag, screenId: screen.id };
  } catch (err) {
    console.error(`  ✗ ${tag} failed after ${((Date.now() - start) / 1000).toFixed(1)}s: ${err.message}`);
    return null;
  }
}

async function main() {
  if (!process.env.STITCH_API_KEY) { console.error("STITCH_API_KEY not set"); process.exit(1); }
  await mkdir(OUTPUT_DIR, { recursive: true });

  const client = new StitchToolClient({ apiKey: process.env.STITCH_API_KEY, timeout: 600_000 });

  console.log("🏗️  Creating project: ECL Deck Portrait...");
  const proj = await client.callTool("create_project", { title: "ECL Deck Portrait 1080x1350" });
  const projectId = proj.name.replace("projects/", "");
  console.log(`   Project: ${projectId}`);

  const results = [];
  for (const { tag, prompt } of PAGES) {
    results.push(await generateOne(client, projectId, tag, prompt));
  }

  const ok = results.filter(Boolean).length;
  console.log(`\n══════════════════════════════════`);
  console.log(`📋 DONE: ${ok}/${results.length} succeeded`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log(`══════════════════════════════════`);
  for (const r of results) { if (r) console.log(`  ${r.tag}: ${r.screenId}`); }
  await client.close();
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
