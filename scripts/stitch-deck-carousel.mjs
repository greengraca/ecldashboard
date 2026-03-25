/**
 * Generate winner's deck presentation carousel (1080×1080 Instagram post, multipage).
 *
 * 1) Inspired by reference images: teal commander art background, gold serif, magazine Q&A
 * 2) Regular ECL identity: dark #0a0a14, gold #D4A017, Cinzel serif
 *
 * Usage: node --env-file=.env.local scripts/stitch-deck-carousel.mjs
 */

import { StitchToolClient } from "@google/stitch-sdk";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "stitch-output", "deck-carousel");

const DIMENSIONS = `The design MUST be exactly 1080 pixels wide × 1080 pixels tall (1:1 square Instagram feed post).`;

// ── INSPIRED VERSION (teal art bg, gold serif, magazine editorial) ───

const INSPIRED_STYLE = `Visual style inspired by premium MTG content creators:
- Background: full-bleed dark teal/blue-green artwork (like Magic: The Gathering card art — mystical forests, underwater scenes, or fantasy landscapes). The art should cover the entire background with a dark overlay for readability.
- Typography: large bold gold/yellow serif font (#D4A517) for headings, white for body text, gold italic for section labels.
- Sponsor/league logo badge in the top-right corner.
- Magazine editorial / interview Q&A format — headings are questions, body text is quoted answers.
- Gold arrow navigation hints ("Swipe right →" or "→").
- MTG card image placeholders shown as fanned-out rectangles with rounded corners.
- Overall feel: premium gaming magazine spread, dark and atmospheric.`;

const INSPIRED = [
  { tag: "inspired-cover", prompt: `${DIMENSIONS}

${INSPIRED_STYLE}

Design the COVER PAGE of a multipage Instagram carousel presenting a winning deck from a competitive Magic: The Gathering league.
This is page 1 of a swipeable carousel post.
Layout:
- Full-bleed dark teal fantasy artwork as background (dark mystical forest or underwater scene) with ~60% dark overlay
- Top-left: Large bold gold serif text "EUROPEAN CEDH LEAGUE" stacked in 3 lines, very prominent
- Top-right: Small league logo badge placeholder (hexagonal shape with gold border)
- Middle: Subheading in white: "The [Month] European League Champion is here!"
- Below: Gold italic text: "Winning with [strategy] in CEDH"
- Lower section: HUGE bold gold serif title with the deck/commander name (e.g. "THE WANDERING MINSTREL")
- Below that: White italic text: "The secrets behind one of the most difficult decks to pilot"
- Bottom-right: Gold text "Swipe right to know more →" with a gold arrow
- Rich, atmospheric, magazine cover feel` },

  { tag: "inspired-why-play", prompt: `${DIMENSIONS}

${INSPIRED_STYLE}

Design PAGE 2 of a multipage Instagram carousel about a winning Magic: The Gathering deck.
This is the "Why Play This Deck?" page.
Layout:
- Same dark teal fantasy art background with overlay
- Top-left: Large bold gold serif heading "WHY PLAY [COMMANDER]?"
- Top-right: League logo badge placeholder
- Body: White text block with a quoted player explanation of what the commander does (2-3 sentences in quotation marks)
- Middle section: Gold serif subheading "PLAYSTYLE OF THE LIST"
- Below: Another white text quote about the deck's playstyle (aggressive, combo, control etc.)
- Bottom: Gold text "Main Plan & Card Choices →" with gold arrow
- Generous spacing between sections, easy to read` },

  { tag: "inspired-main-plan", prompt: `${DIMENSIONS}

${INSPIRED_STYLE}

Design PAGE 3 of a multipage Instagram carousel about a winning Magic: The Gathering deck.
This is the "Main Plan" page.
Layout:
- Same dark teal fantasy art background with overlay
- Top: Large bold gold serif heading "MAIN PLAN"
- Top-right: League logo badge
- Upper-middle: 3 MTG card images fanned out (overlapping rectangles with rounded corners, slightly rotated — center card higher). Use dark placeholder rectangles with thin borders to represent the cards.
- Below cards: White quoted text explaining the deck's main win conditions and strategy (3-4 sentences)
- Lower section: Bold gold serif subheading "HOW HAS IT BEEN PLAYING IN ECL?"
- Below: White quoted text about the player's league experience
- Bottom: Gold text "Join our league, link in bio"` },

  { tag: "inspired-card-choices", prompt: `${DIMENSIONS}

${INSPIRED_STYLE}

Design PAGE 4 (final page) of a multipage Instagram carousel about a winning Magic: The Gathering deck.
This is the "Card Choices" page.
Layout:
- Same dark teal fantasy art background with overlay (slightly different shade — more navy/dark blue)
- Top: Large bold gold serif heading "CARD CHOICES"
- Top-right: League logo badge
- Upper section: 4-5 MTG card images in a row (overlapping rectangles with rounded corners). Use dark placeholder rectangles with thin borders.
- Middle: White quoted text explaining key card choices and deck philosophy (3-4 sentences with some bold gold keywords)
- Lower section: Bold gold serif subheading "WHAT INSPIRED YOU TO BUILD THE DECK?"
- Below: White quoted text about the player's inspiration
- Bottom: Gold text "Decklist in the description ↓" with downward arrow` },
];

// ── REGULAR ECL IDENTITY VERSION ────────────────────────────────────

const ECL_STYLE = `Brand: ECL (European cEDH League) — competitive Magic: The Gathering Commander league.
Dark background (#0a0a14). Gold accent (#D4A017). White text on dark.
Cinzel serif font for headings. Subtle grain/noise texture overlay.
ECL logo placeholder at the top. Premium dark luxury esports aesthetic.
No background artwork — use geometric shapes, subtle gradients, gold line decorations.`;

const ECL = [
  { tag: "ecl-cover", prompt: `${DIMENSIONS}

${ECL_STYLE}

Design the COVER PAGE of a multipage Instagram carousel presenting a winning deck from ECL.
Layout:
- Near-black background (#0a0a14) with subtle noise texture and faint geometric gold line patterns
- Top-center: ECL logo placeholder and "EUROPEAN CEDH LEAGUE" in gold Cinzel serif
- Center: Large gold decorative frame or ornate border element
- Inside frame: "CHAMPION'S DECK" in gold serif, month label below in white
- Lower center: Commander/deck name in HUGE bold gold text
- Below: Deck archetype tagline in muted gold italic
- Bottom: "Swipe to explore →" in white with gold arrow
- Bottom edge: Thin gold ornamental line
- Regal, trophy-case aesthetic` },

  { tag: "ecl-why-play", prompt: `${DIMENSIONS}

${ECL_STYLE}

Design PAGE 2 of an ECL winning deck carousel (1:1 Instagram post).
"Why Play This Deck?" page.
Layout:
- Dark background with subtle gold geometric accents (thin diagonal lines, corner ornaments)
- Top: "WHY PLAY THIS DECK?" in bold gold Cinzel
- ECL logo small in corner
- Two content sections with thin gold line separators:
  1. Section with gold label "THE COMMANDER" — white body text placeholder (3 sentences)
  2. Section with gold label "PLAYSTYLE" — white body text placeholder (3 sentences)
- Each section has a thin gold vertical accent line on the left margin
- Bottom: Gold text "→" navigation hint
- Clean, structured, premium dark feel` },

  { tag: "ecl-main-plan", prompt: `${DIMENSIONS}

${ECL_STYLE}

Design PAGE 3 of an ECL winning deck carousel (1:1 Instagram post).
"Main Plan & Strategy" page.
Layout:
- Dark background with subtle gold accents
- Top: "MAIN PLAN" in bold gold Cinzel
- Upper section: 3 card placeholder slots in a row (dark rectangles with gold borders, slightly overlapping)
- Below cards: "KEY COMBOS & WIN CONDITIONS" gold label
- White text placeholder explaining strategy (3-4 sentences)
- Lower section: "ECL PERFORMANCE" gold label
- Stats row: Win rate, games played, record — in gold numbers with white labels
- Bottom: "Join the league — link in bio" in muted gold
- Clean data-driven layout` },

  { tag: "ecl-card-choices", prompt: `${DIMENSIONS}

${ECL_STYLE}

Design PAGE 4 (final) of an ECL winning deck carousel (1:1 Instagram post).
"Card Choices" page.
Layout:
- Dark background, gold accents
- Top: "CARD CHOICES" in bold gold Cinzel
- Upper section: 4 card placeholder slots (dark rectangles with gold borders)
- Below: "TECH CHOICES" gold label with white text explaining unique card picks (2-3 sentences)
- Lower section: "DECK INSPIRATION" gold label with white text quote (2-3 sentences)
- Bottom: "Full decklist in description ↓" with downward gold arrow
- Small ECL logo centered at very bottom
- Thin gold ornamental footer line` },
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

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.STITCH_API_KEY) { console.error("STITCH_API_KEY not set"); process.exit(1); }
  await mkdir(OUTPUT_DIR, { recursive: true });

  const client = new StitchToolClient({
    apiKey: process.env.STITCH_API_KEY, timeout: 600_000,
  });

  console.log("🏗️  Creating project: ECL Deck Carousel...");
  const proj = await client.callTool("create_project", { title: "ECL Deck Carousel" });
  const projectId = proj.name.replace("projects/", "");
  console.log(`   Project: ${projectId}`);

  const all = [...INSPIRED, ...ECL];
  const results = [];
  for (const { tag, prompt } of all) {
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
