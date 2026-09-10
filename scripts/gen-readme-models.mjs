#!/usr/bin/env node
/**
 * Regenerate every table in this repo that restates core-models.json.
 *
 * core-models.json is the single source of truth. This script renders each table
 * between a pair of HTML-comment markers, so editing only the JSON keeps the docs
 * in sync. There are two, in two different files:
 *
 *   CORE_MODELS   docs/CORE-MODELS.md    the public lineup — tier -> model id
 *   CORE_ROUTING  docs/CORE-CUTOVER.md   the operator view — slot -> provider, key
 *
 * The routing table is here because it was WRONG when it was hand-typed: it named
 * `openai/gpt-5.6-sol` for core-3 long after the JSON had moved to
 * `openai/gpt-6-astra`. A doc that restates a config's number drifts from it; the
 * only fix that holds is for the doc to stop holding the number.
 *
 * There is deliberately NO display-name column ("GLM 5.3"). A friendly name is not
 * in core-models.json, so generating one means guessing it from the wire id — and a
 * guessed name is the same drift in a new costume. The wire id names the model
 * unambiguously, which is what an operator table is for.
 *
 * Usage:
 *   node scripts/gen-readme-models.mjs          # write any file that changed
 *   node scripts/gen-readme-models.mjs --check  # exit 1 if any file is out of date
 *
 * No dependencies — pure Node ESM.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = join(ROOT, "core-models.json");

/** Keep in sync with EMPTY_SLOT_SENTINELS in the app, the proxy and the launchpad. */
const EMPTY_SLOT_SENTINELS = new Set([
  "tba", "tbd", "none", "n/a", "na", "-", "null", "undefined",
]);

function isEmptySlot(id) {
  if (typeof id !== "string") return true;
  const t = id.trim();
  return t === "" || EMPTY_SLOT_SENTINELS.has(t.toLowerCase());
}

/** "core-1" -> "Core 1" (falls back to the raw key for anything unexpected). */
function tierLabel(key) {
  const m = /^core-(\d+)$/.exec(key);
  return m ? `Core ${m[1]}` : key;
}

/**
 * Configured slots only, numeric-aware so core-2 sorts before core-10.
 *
 * A parked slot is skipped rather than rendered as "TBA": every other layer reads
 * an empty slot as absent, so a doc that lists it is the only place in the system
 * claiming a tier exists.
 */
function slots(models) {
  return Object.entries(models)
    .filter(([, id]) => !isEmptySlot(id))
    .sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
}

function table(header, rows) {
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows,
  ].join("\n");
}

function renderModels(cfg) {
  return table(
    ["Tier", "Model"],
    slots(cfg.models).map(([key, id]) => `| ${tierLabel(key)} | \`${id}\` |`),
  );
}

function renderRouting(cfg) {
  const providers = cfg.providers ?? {};
  const routing = cfg.routing ?? {};
  const rows = slots(cfg.models).map(([key, wireId]) => {
    const route = routing[key];
    // An unrouted slot is a real state worth SHOWING rather than omitting: it is
    // configured but has nowhere to send a request, which the proxy surfaces as
    // core_unavailable. Rendering it blank is how someone finds that out here.
    const provider = route?.provider ?? "—";
    const apiModelId = route?.apiModelId ? `\`${route.apiModelId}\`` : "—";
    const keyEnv = providers[route?.provider]?.apiKeyEnv;
    return `| ${key} | \`${provider}\` | \`${wireId}\` | ${apiModelId} | ${keyEnv ? `\`${keyEnv}\`` : "—"} |`;
  });
  return table(["Slot", "Provider", "Wire id", "API model id", "Key"], rows);
}

const TARGETS = [
  { file: "docs/CORE-MODELS.md", marker: "CORE_MODELS", render: renderModels },
  { file: "docs/CORE-CUTOVER.md", marker: "CORE_ROUTING", render: renderRouting },
];

function apply(cfg, { file, marker, render }) {
  const path = join(ROOT, file);
  const START = `<!-- ${marker}:START`;
  const END = `<!-- ${marker}:END -->`;

  const text = readFileSync(path, "utf-8");
  const startIdx = text.indexOf(START);
  const endIdx = text.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.error(
      `Could not find ${marker} markers in ${file}. Add:\n${START} ... -->\n...\n${END}`,
    );
    process.exit(1);
  }

  // Preserve the full START comment line (it carries the "do not edit" note).
  const startLineEnd = text.indexOf("\n", startIdx);
  const startComment = text.slice(startIdx, startLineEnd);

  const block = `${startComment}\n${render(cfg)}\n${END}`;
  const next = text.slice(0, startIdx) + block + text.slice(endIdx + END.length);
  return { path, file, text, next, changed: next !== text };
}

function main() {
  const check = process.argv.includes("--check");

  const cfg = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  if (!cfg?.models || typeof cfg.models !== "object" || Array.isArray(cfg.models)) {
    console.error("core-models.json has no `models` object — nothing to render.");
    process.exit(1);
  }

  const results = TARGETS.map((t) => apply(cfg, t));
  const stale = results.filter((r) => r.changed);

  if (stale.length === 0) {
    console.log(`Up to date: ${results.map((r) => r.file).join(", ")}`);
    return;
  }

  if (check) {
    for (const r of stale) console.error(`${r.file} is out of date`);
    console.error("Run: node scripts/gen-readme-models.mjs");
    process.exit(1);
  }

  for (const r of stale) {
    writeFileSync(r.path, r.next, "utf-8");
    console.log(`Regenerated the table in ${r.file}`);
  }
}

main();
