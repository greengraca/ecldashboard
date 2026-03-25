/**
 * Iterate on Stitch screens: edit or generate variants.
 *
 * Usage:
 *   # Edit a screen with a prompt
 *   node --env-file=.env.local scripts/stitch-iterate.mjs edit <screenId> "Make the background darker, add gold glow"
 *
 *   # Generate variants (default: 3 EXPLORE variants)
 *   node --env-file=.env.local scripts/stitch-iterate.mjs variants <screenId> "Try different color schemes"
 *
 *   # Generate 5 REIMAGINE variants
 *   node --env-file=.env.local scripts/stitch-iterate.mjs variants <screenId> "Bolder typography" --count 5 --range REIMAGINE
 *
 *   # List all screens in a project
 *   node --env-file=.env.local scripts/stitch-iterate.mjs list <projectId>
 *
 * Screen IDs from the generation run:
 *   finals-v1:  2a2efbd5a61d4ac89f9d57b46b3a8823
 *   finals-v2:  831bf97abd7f478a97d58bad53684d70
 *   finals-v4:  0a0b18ad427b45848224b936f1cab794
 *   finals-v5:  fb3aaafb594b4a54b8aec633548177cb
 *   top16-v1:   d04226ff6497494595312095c3bbbd5d
 *   top16-v2:   217b7b0613eb41f5bafd9259deaaa8ea
 *   top16-v3:   bfa3f01d647c454eba5603a4e0a44fd9
 *   top16-v4:   64a99a772e6842db8b44979e667ab00b
 *   top16-v5:   8008830186dc4615a2cc59cfcdfb60c9
 *
 * Project ID: 5269690160946744341
 */

import { StitchToolClient } from "@google/stitch-sdk";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "stitch-output");
const PROJECT_ID = "5269690160946744341";

function extractScreen(raw) {
  for (const comp of raw.outputComponents || []) {
    if (comp.design?.screens?.length > 0) {
      return comp.design.screens[0];
    }
  }
  return null;
}

function extractScreens(raw) {
  const screens = [];
  for (const comp of raw.outputComponents || []) {
    if (comp.design?.screens) {
      screens.push(...comp.design.screens);
    }
  }
  return screens;
}

async function downloadFile(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  await writeFile(filepath, Buffer.from(await res.arrayBuffer()));
}

async function saveScreen(screen, tag) {
  if (screen.screenshot?.downloadUrl) {
    const p = join(OUTPUT_DIR, `${tag}.png`);
    await downloadFile(screen.screenshot.downloadUrl, p);
    console.log(`  ✓ ${tag}.png`);
  }
  if (screen.htmlCode?.downloadUrl) {
    const p = join(OUTPUT_DIR, `${tag}.html`);
    await downloadFile(screen.htmlCode.downloadUrl, p);
    console.log(`  ✓ ${tag}.html`);
  }
}

// ── Commands ─────────────────────────────────────────────────────────

async function cmdEdit(client, screenId, prompt) {
  console.log(`✏️  Editing screen ${screenId}...`);
  console.log(`   Prompt: "${prompt}"\n`);

  const start = Date.now();
  const raw = await client.callTool("edit_screens", {
    projectId: PROJECT_ID,
    screenIds: [screenId],
    prompt,
    modelId: "GEMINI_3_PRO",
  });

  const screen = extractScreen(raw);
  if (!screen) {
    console.error("No screen in response");
    return;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  Done in ${elapsed}s — new screen: ${screen.id}`);

  const tag = `edit-${screen.id.slice(0, 8)}`;
  await saveScreen(screen, tag);
  console.log(`\n  New screen ID: ${screen.id}`);
}

async function cmdVariants(client, screenId, prompt, count, range) {
  console.log(`🎨 Generating ${count} ${range} variants of ${screenId}...`);
  console.log(`   Prompt: "${prompt}"\n`);

  const start = Date.now();
  const raw = await client.callTool("generate_variants", {
    projectId: PROJECT_ID,
    screenIds: [screenId],
    prompt,
    variantCount: count,
    creativeRange: range,
    aspects: ["LAYOUT", "COLOR_SCHEME", "IMAGES", "TEXT_FONT"],
    modelId: "GEMINI_3_PRO",
  });

  const screens = extractScreens(raw);
  if (screens.length === 0) {
    console.error("No screens in response");
    console.log("Response keys:", JSON.stringify(raw, null, 2).slice(0, 500));
    return;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  Generated ${screens.length} variants in ${elapsed}s\n`);

  for (let i = 0; i < screens.length; i++) {
    const tag = `variant-${screens[i].id.slice(0, 8)}`;
    console.log(`  Variant ${i + 1} — screen: ${screens[i].id}`);
    await saveScreen(screens[i], tag);
  }
}

async function cmdList(client, projectId) {
  console.log(`📋 Listing screens in project ${projectId}...\n`);
  const raw = await client.callTool("list_screens", { projectId });
  const screens = raw.screens || [];
  if (screens.length === 0) {
    console.log("  No screens found");
    return;
  }
  for (const s of screens) {
    console.log(`  ${s.id}  ${s.title || "(untitled)"}  ${s.width}×${s.height}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || !["edit", "variants", "list"].includes(command)) {
    console.log(`Usage:
  edit <screenId> "prompt"           — Edit a screen
  variants <screenId> "prompt"       — Generate variants
    --count N                        — Number of variants (1-5, default 3)
    --range REFINE|EXPLORE|REIMAGINE — Creative range (default EXPLORE)
  list [projectId]                   — List screens in project`);
    process.exit(0);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const client = new StitchToolClient({
    apiKey: process.env.STITCH_API_KEY,
    timeout: 600_000,
  });

  try {
    if (command === "list") {
      await cmdList(client, args[1] || PROJECT_ID);
    } else if (command === "edit") {
      const screenId = args[1];
      const prompt = args[2];
      if (!screenId || !prompt) {
        console.error('Usage: edit <screenId> "prompt"');
        process.exit(1);
      }
      await cmdEdit(client, screenId, prompt);
    } else if (command === "variants") {
      const screenId = args[1];
      const prompt = args[2];
      if (!screenId || !prompt) {
        console.error('Usage: variants <screenId> "prompt"');
        process.exit(1);
      }
      const countIdx = args.indexOf("--count");
      const count = countIdx !== -1 ? parseInt(args[countIdx + 1]) : 3;
      const rangeIdx = args.indexOf("--range");
      const range = rangeIdx !== -1 ? args[rangeIdx + 1] : "EXPLORE";
      await cmdVariants(client, screenId, prompt, count, range);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
