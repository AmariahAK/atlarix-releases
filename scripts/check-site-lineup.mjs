#!/usr/bin/env node
/**
 * Does atlarix.dev actually serve the Core lineup this repo publishes?
 *
 * WHY A SITE CHECK AND NOT A FILE CHECK. `core-models.json` is live the moment it lands
 * on main — every installed client picks it up within the hour, which is the whole
 * design. The marketing site cannot work that way: it is statically generated, so it
 * only tells the truth after someone regenerates
 * `atlarix-launchpad/src/data/core-lineup.generated.json` and redeploys. Nothing
 * connects those two events, and the failure is silent in the worst direction — the
 * site keeps confidently naming a model that is no longer served.
 *
 * That is not hypothetical: the launchpad's comparison post said Core was "currently
 * GLM 5.3 and GPT 5.6" while three slots were mapped and one of them was a GPT-6.
 *
 * The assertion is on the WIRE ID (`z-ai/glm-5.3`), not the display name, because the
 * id is what this repo actually decides. Display names come from models.dev and are
 * formatted by the site; asserting on them would fail on a punctuation change and tell
 * us nothing about whether the right model is being advertised.
 *
 * Checking the deployed SURFACE rather than a file in another repo is deliberate, and
 * the same lesson the release runbook learned about `/releases/latest`: the only thing
 * that proves what users see is what the server returns.
 *
 * Exit 1 means the site is BEHIND, not that anything here is wrong. The fix is in the
 * launchpad: `npm run gen:core-lineup`, commit, redeploy.
 *
 * Usage: node scripts/check-site-lineup.mjs [url]
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORE_MODELS_PATH = join(ROOT, "core-models.json");
const PAGE_URL = process.argv[2] || "https://www.atlarix.dev/docs/guides/core-models";

/** Keep in sync with EMPTY_SLOT_SENTINELS in the app, the proxy and the launchpad. */
const EMPTY_SLOT_SENTINELS = new Set([
  "tba", "tbd", "none", "n/a", "na", "-", "null", "undefined",
]);

function isEmptySlot(id) {
  if (typeof id !== "string") return true;
  const t = id.trim();
  return t === "" || EMPTY_SLOT_SENTINELS.has(t.toLowerCase());
}

const cfg = JSON.parse(readFileSync(CORE_MODELS_PATH, "utf8"));
const expected = Object.entries(cfg.models ?? {})
  .filter(([, id]) => !isEmptySlot(id))
  .map(([slot, id]) => ({ slot, id: String(id) }));

if (expected.length === 0) {
  console.log("[site-lineup] core-models.json maps no models — nothing to assert.");
  process.exit(0);
}

const res = await fetch(PAGE_URL, { headers: { "user-agent": "atlarix-ci-site-lineup" } });
if (!res.ok) {
  // A fetch failure is NOT drift. Saying "the site is stale" because the network
  // hiccuped is how a check earns the right to be ignored.
  console.error(`[site-lineup] could not read ${PAGE_URL} — HTTP ${res.status}. Not treating as drift.`);
  process.exit(1);
}
const html = await res.text();

const missing = expected.filter((m) => !html.includes(m.id));
for (const m of expected) {
  console.log(`  ${html.includes(m.id) ? "✓" : "✗"} ${m.slot}  ${m.id}`);
}

if (missing.length > 0) {
  console.error(
    `\n[site-lineup] ${PAGE_URL} does not mention ${missing.length} mapped model(s): ` +
      missing.map((m) => m.id).join(", ") +
      `\n  The site is BEHIND core-models.json. In atlarix-launchpad:\n` +
      `    npm run gen:core-lineup && git commit -am "chore: refresh Core lineup" && git push\n` +
      `  (the push is what redeploys it).`,
  );
  process.exit(1);
}

console.log(`\n[site-lineup] ${PAGE_URL} serves all ${expected.length} mapped Core models.`);
