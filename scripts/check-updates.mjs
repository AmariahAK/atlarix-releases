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

/** Print whatever went wrong and stop. */
function report() {
  console.error("updates.json would not be shown by the app:\n");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const entries = raw?.entries;
if (!Array.isArray(entries)) {
  // REPORT AND STOP, not `fail()` and fall through. `fail` only records — it
  // does not return — so continuing here reached `entries.forEach` on a value
  // that is not an array and died with an unhandled TypeError, printing a stack
  // trace instead of the one clear sentence this script exists to print. The
  // check was right and the exit code was right; the output was useless.
  fail("`entries` must be an array — the app reads the first element of it.");
  report();
}
if (entries.length === 0) {
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

/**
 * IS THE FIRST ENTRY ACTUALLY THE NEWEST?
 *
 * The app reads `entries[0]` and nothing else. So appending a new note to the
 * END of the array — which is the natural thing to do to a list, and which every
 * check above passes happily — publishes nothing: the app keeps showing the old
 * top entry, and the note nobody sees is the one that was just written.
 *
 * That is the same failure mode as the rest of this file. The app does not
 * complain about a note it cannot see any more than it complains about an
 * `http://` link; it just renders the wrong thing, silently, and the person who
 * wrote the note has no way to tell.
 *
 * Version-shaped ids only. Ids are free-form by design (the dismissal key is
 * whatever you make it), so anything that is not `major.minor.patch` is skipped
 * rather than guessed at — an unordered pair of non-version ids is not evidence
 * of a mistake.
 */
const version = (id) => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(id);
  return m ? Number(m[1]) * 1e6 + Number(m[2]) * 1e3 + Number(m[3]) : null;
};

const versioned = entries
  .map((e, i) => ({ i, id: typeof e?.id === "string" ? e.id.trim() : "", v: version(typeof e?.id === "string" ? e.id.trim() : "") }))
  .filter((e) => e.v !== null);

for (let i = 1; i < versioned.length; i++) {
  if (versioned[i].v > versioned[i - 1].v) {
    fail(
      `entries[${versioned[i].i}] ("${versioned[i].id}") is newer than ` +
        `entries[${versioned[i - 1].i}] ("${versioned[i - 1].id}"). ` +
        `The app shows entries[0] only, so a newer note further down is never seen — ` +
        `put the newest entry first.`,
    );
    break;
  }
}

if (problems.length > 0) report();

console.log(`updates.json is publishable (${entries.length} entr${entries.length === 1 ? "y" : "ies"}).`);
