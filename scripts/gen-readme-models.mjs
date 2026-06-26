#!/usr/bin/env node
/**
 * Regenerate the "Atlarix Core models" table in README.md from core-models.json.
 *
 * core-models.json is the single source of truth. This script renders the table
 * between the <!-- CORE_MODELS:START --> / <!-- CORE_MODELS:END --> markers so
 * editing only the JSON keeps the README in sync.
 *
 * Usage:
 *   node scripts/gen-readme-models.mjs          # write README.md if changed
 *   node scripts/gen-readme-models.mjs --check  # exit 1 if README is out of date
 *
 * No dependencies — pure Node ESM.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = join(ROOT, "core-models.json");
const README_PATH = join(ROOT, "README.md");
const START = "<!-- CORE_MODELS:START";
const END = "<!-- CORE_MODELS:END -->";

/** "core-1" -> "Core 1" (falls back to the raw key for anything unexpected). */
function tierLabel(key) {
  const m = /^core-(\d+)$/.exec(key);
  return m ? `Core ${m[1]}` : key;
}

function buildTable(models) {
  const rows = Object.entries(models)
    // numeric-aware sort so core-2 comes before core-10
    .sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    )
    .map(([key, id]) => `| ${tierLabel(key)} | \`${id}\` |`);
  return ["| Tier | Model |", "| --- | --- |", ...rows].join("\n");
}

function main() {
  const check = process.argv.includes("--check");

  const payload = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  const models = payload?.models;
  if (!models || typeof models !== "object" || Array.isArray(models)) {
    console.error("core-models.json has no `models` object — nothing to render.");
    process.exit(1);
  }

  const readme = readFileSync(README_PATH, "utf-8");
  const startIdx = readme.indexOf(START);
  const endIdx = readme.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.error(
      `Could not find CORE_MODELS markers in README.md. Add:\n${START} ... -->\n...\n${END}`,
    );
    process.exit(1);
  }

  // Preserve the full START comment line (it carries the "do not edit" note).
  const startLineEnd = readme.indexOf("\n", startIdx);
  const startComment = readme.slice(startIdx, startLineEnd);

  const block = `${startComment}\n${buildTable(models)}\n${END}`;
  const next = readme.slice(0, startIdx) + block + readme.slice(endIdx + END.length);

  if (next === readme) {
    console.log("README.md already up to date.");
    return;
  }

  if (check) {
    console.error("README.md is out of date — run: node scripts/gen-readme-models.mjs");
    process.exit(1);
  }

  writeFileSync(README_PATH, next, "utf-8");
  console.log("README.md Core models table regenerated.");
}

main();
