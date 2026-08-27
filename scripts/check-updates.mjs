#!/usr/bin/env node
/**
 * Validate updates.json against the rules the desktop app actually applies.
 *
 * WHY THIS EXISTS. The app fetches this file hourly and, on anything it cannot
 * use, renders NOTHING — deliberately, because a blank card with a close button
 * reads as a bug. That is the right behaviour for a user and the worst possible
 * behaviour for whoever edits this file: a missing `body`, a `http://` link or a
 * stray trailing comma all produce exactly the same symptom as "there is no note
 * right now", which is silence. Nobody finds out until they wonder why the panel
 * never appeared.
 *
 * So the rules live here too, and CI fails loudly instead.
 *
 * Kept in sync by hand with `parseUpdatesPayload` in the app
 * (`src/main/whats-new.ts`). This is a second implementation of the same rules
 * and that is a real cost — but the alternative is publishing to a client that
 * cannot complain, and a wrong check here fails a build while a wrong file there
 * fails a customer.
 *
 * Usage: node scripts/check-updates.mjs
 * Exit 0 = publishable. Exit 1 = the app would ignore this file.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FILE = path.join(ROOT, "updates.json");

/** Roughly two lines in the panel. Past this it has become the changelog. */
const MAX_BODY = 200;
const MAX_TITLE = 80;

const problems = [];

function fail(msg) {
  problems.push(msg);
}

let raw;
try {
  raw = JSON.parse(readFileSync(FILE, "utf-8"));
} catch (e) {
  console.error(`updates.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

const entries = raw?.entries;
if (!Array.isArray(entries)) {
  fail("`entries` must be an array — the app reads the first element of it.");
} else if (entries.length === 0) {
  // Not an error: an empty list is a deliberate "nothing to say", and the app
  // treats it as clearing the note rather than as a broken file.
  console.log("updates.json has no entries — the app will show no panel.");
  process.exit(0);
}

const seen = new Set();
entries.forEach((entry, i) => {
  const where = `entries[${i}]`;
  const str = (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null);

  const id = str(entry?.id);
  if (!id) fail(`${where}: \`id\` is required — it is the dismissal key.`);
  else if (seen.has(id)) {
    // Two entries sharing an id means dismissing one dismisses the other, and
    // which one you dismissed depends on order.
    fail(`${where}: duplicate id "${id}".`);
  } else seen.add(id);

  const title = str(entry?.title);
  if (!title) fail(`${where}: \`title\` is required.`);
  else if (title.length > MAX_TITLE) {
    fail(`${where}: title is ${title.length} chars; keep it under ${MAX_TITLE}.`);
  }

  const body = str(entry?.body);
  if (!body) fail(`${where}: \`body\` is required.`);
  else if (body.length > MAX_BODY) {
    fail(
      `${where}: body is ${body.length} chars; keep it under ${MAX_BODY}. ` +
        `The panel is a pointer to the changelog, not a second one.`,
    );
  }

  const link = str(entry?.link);
  if (link && !/^https:\/\//i.test(link)) {
    // The app drops a non-https link silently, so the label would render a
    // button that does nothing.
    fail(`${where}: link must be https — "${link}" would be dropped by the app.`);
  }
  if (str(entry?.linkLabel) && !link) {
    fail(`${where}: \`linkLabel\` with no \`link\` renders a button that does nothing.`);
  }
});

if (problems.length > 0) {
  console.error("updates.json would not be shown by the app:\n");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`updates.json is publishable (${entries.length} entr${entries.length === 1 ? "y" : "ies"}).`);
