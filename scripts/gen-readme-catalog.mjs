#!/usr/bin/env node
/**
 * Keep the README's bring-your-own-key catalogue size honest, from models.dev.
 *
 * The README advertised "145+ providers" in its opening sentence. models.dev carries
 * 213, and the app bundles the whole catalogue — so the number was wrong in the
 * UNDERSTATING direction, which is exactly why it survived so long: the claim stayed
 * true, it just quietly stopped being impressive. Nobody audits a number that is not
 * false yet.
 *
 * Separate from `gen-readme-models.mjs` on purpose. That script is pure and local — it
 * reads core-models.json and nothing else, so it can never fail for a reason outside
 * this repo. This one needs the network, so it FAILS SOFT: on an unreachable models.dev
 * it leaves the README exactly as it found it and exits 0. A docs refresher that can
 * break CI because a third party is down would get switched off, and then the number
 * goes stale again.
 *
 * Renders between the CATALOG_COUNTS markers. Figures are floored to a "+" value so the
 * published claim can never overstate as the catalogue shifts between runs.
 *
 * Usage:
 *   node scripts/gen-readme-catalog.mjs          # write README.md if changed
 *   node scripts/gen-readme-catalog.mjs --check  # exit 1 if out of date
 *
 * No dependencies — pure Node ESM.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const README_PATH = join(ROOT, "README.md");
const MODELS_DEV_URL = "https://models.dev/api.json";
const START = "<!-- CATALOG_COUNTS:START";
const END = "<!-- CATALOG_COUNTS:END -->";

const floorTo = (n, step) => Math.floor(n / step) * step;

async function counts() {
  const res = await fetch(MODELS_DEV_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`models.dev -> HTTP ${res.status}`);
  const catalog = await res.json();
  let providers = 0;
  let toolModels = 0;
  for (const p of Object.values(catalog)) {
    providers += 1;
    for (const m of Object.values(p.models ?? {})) if (m.tool_call) toolModels += 1;
  }
  if (providers < 100) {
    // A truncated response is worse than no response: it would publish a SMALLER
    // number confidently. Same guard the app's snapshot fetcher applies.
    throw new Error(`only ${providers} providers — refusing to publish a truncated count`);
  }
  return {
    providers: `${floorTo(providers, 10)}+`,
    toolModels: `${floorTo(toolModels, 500).toLocaleString("en-US")}+`,
  };
}

const readme = readFileSync(README_PATH, "utf8");
const s = readme.indexOf(START);
const e = readme.indexOf(END);
if (s === -1 || e === -1) {
  console.error(`[readme-catalog] markers not found in README.md — nothing to update.`);
  process.exit(1);
}

let c;
try {
  c = await counts();
} catch (err) {
  console.warn(
    `[readme-catalog] SKIPPED — ${err instanceof Error ? err.message : String(err)}. ` +
      `README left unchanged.`,
  );
  process.exit(0);
}

const body = `${c.providers} providers and ${c.toolModels} tool-capable models`;
const head = readme.slice(0, s);
const marker = readme.slice(s, readme.indexOf("-->", s) + 3);
const next = `${head}${marker}${body}${readme.slice(e)}`;

if (process.argv.includes("--check")) {
  if (next !== readme) {
    console.error(
      `[readme-catalog] README catalogue counts are stale — expected "${body}".\n` +
        `  Run: node scripts/gen-readme-catalog.mjs`,
    );
    process.exit(1);
  }
  console.log(`[readme-catalog] up to date — ${body}.`);
} else if (next === readme) {
  console.log(`[readme-catalog] no change — ${body}.`);
} else {
  writeFileSync(README_PATH, next);
  console.log(`[readme-catalog] wrote ${body}.`);
}
