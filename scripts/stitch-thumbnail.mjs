/**
 * Generate YouTube thumbnail for ECL finals stream (1920×1080 landscape).
 * Inspired by: 4-quadrant commander art grid with league logo center overlay.
 *
 * Usage: node --env-file=.env.local scripts/stitch-thumbnail.mjs
 */

import { StitchToolClient } from "@google/stitch-sdk";
// No local file downloads — review in Stitch directly

const DIMENSIONS = `The design MUST be exactly 1920 pixels wide × 1080 pixels tall (16:9 landscape YouTube thumbnail format).`;

const PROMPTS = [
  // v1: Close to the reference — 4 quadrant grid
  { tag: "finals-thumb-v1", prompt: `${DIMENSIONS}

Design a YouTube thumbnail for a competitive Magic: The Gathering finals live stream.
This is for a league called ECL (European cEDH League).

Creative direction — 4-QUADRANT COMMANDER GRID:
- The entire 1920×1080 canvas is divided into a 2×2 grid of 4 panels, each representing one finalist
- Each panel is filled with vivid, colorful fantasy artwork (Magic: The Gathering style — a different fantasy character/creature per quadrant: a bard with a harp, a warrior with lightning, a crystalline fortress, a druid with a beast)
- Thin dark gap (4-6px) between the 4 panels
- Each panel has a semi-transparent dark gradient at the bottom edge with the commander/deck name in white serif text (e.g. "The Wandering Minstrel", "Tymna / Kraum")
- CENTER: A large league logo badge overlapping all 4 quadrants (circular/hexagonal shape with gold border, "ECL" text, and a sponsor logo placeholder). The badge should be prominent, roughly 15-20% of the width.
- No other text — the artwork and names do all the talking
- Vibrant, colorful, eye-catching at small YouTube thumbnail size
- High contrast between the 4 art panels` },

  // v2: More dramatic with text overlay
  { tag: "finals-thumb-v2", prompt: `${DIMENSIONS}

Design a YouTube thumbnail for a competitive Magic: The Gathering league finals stream.
League: ECL (European cEDH League).

Creative direction — VERSUS CLASH:
- 4 fantasy character artworks arranged across the width, each taking ~25% width
- Characters face inward toward the center, creating a "clash" composition
- Each character is a different fantasy archetype (wizard, warrior, druid, rogue) in vivid colors
- Dark vignette edges and dramatic lighting — golden/warm highlights
- CENTER: Large bold gold text "FINALS" with metallic/3D effect, slightly angled for dynamism
- Below "FINALS": "ECL" in a gold badge/shield shape
- Bottom of each character section: commander name in white bold text with dark text shadow
- Overall: extremely eye-catching, vibrant colors, high contrast — must grab attention at small size
- YouTube thumbnail energy: bold, loud, impossible to scroll past` },

  // v3: Cinematic widescreen
  { tag: "finals-thumb-v3", prompt: `${DIMENSIONS}

Design a YouTube thumbnail for a competitive Magic: The Gathering league finals live stream.
League: ECL (European cEDH League).

Creative direction — CINEMATIC BATTLE:
- Widescreen cinematic composition with a dark fantasy battlefield scene
- 4 commander character silhouettes/figures standing in a dramatic lineup across the frame, each with a different colored magical aura (gold, blue, green, purple)
- Dark stormy sky background with dramatic clouds and lightning
- Large "ECL FINALS" text in bold gold metallic serif at the top, with a slight glow
- League logo badge (hexagonal, gold) in the top-right corner
- Bottom: 4 commander names in white, evenly spaced across the width, each under their character
- "LIVE" badge in red in the top-left corner
- Cinematic color grading: teal shadows, golden highlights
- Epic, dramatic, tournament-worthy` },
];

function extractScreen(raw) {
  for (const comp of raw.outputComponents || []) {
    if (comp.design?.screens?.length > 0) return comp.design.screens[0];
  }
  return null;
}

async function generateOne(client, projectId, tag, prompt) {
  console.log(`\n🎨 Generating ${tag}...`);
  const start = Date.now();
  try {
    const raw = await client.callTool("generate_screen_from_text", {
      projectId, prompt, deviceType: "DESKTOP", modelId: "GEMINI_3_PRO",
    });
    const screen = extractScreen(raw);
    if (!screen) { console.error(`  ✗ ${tag}: no screen`); return null; }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ✓ ${tag} done in ${elapsed}s — screen: ${screen.id}`);
    return { tag, screenId: screen.id };
  } catch (err) {
    console.error(`  ✗ ${tag} failed after ${((Date.now() - start) / 1000).toFixed(1)}s: ${err.message}`);
    return null;
  }
}

async function main() {
  if (!process.env.STITCH_API_KEY) { console.error("STITCH_API_KEY not set"); process.exit(1); }

  const client = new StitchToolClient({ apiKey: process.env.STITCH_API_KEY, timeout: 600_000 });

  console.log("🏗️  Creating project: ECL YouTube Thumbnails...");
  const proj = await client.callTool("create_project", { title: "ECL YouTube Thumbnails" });
  const projectId = proj.name.replace("projects/", "");
  console.log(`   Project: ${projectId}`);

  const results = [];
  for (const { tag, prompt } of PROMPTS) {
    results.push(await generateOne(client, projectId, tag, prompt));
  }

  const ok = results.filter(Boolean).length;
  console.log(`\n══════════════════════════════════`);
  console.log(`📋 DONE: ${ok}/${results.length} succeeded`);
  console.log(`   View at: https://stitch.withgoogle.com/`);
  console.log(`══════════════════════════════════`);
  for (const r of results) { if (r) console.log(`  ${r.tag}: ${r.screenId}`); }
  await client.close();
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
