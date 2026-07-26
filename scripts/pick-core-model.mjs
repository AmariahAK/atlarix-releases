#!/usr/bin/env node
/**
 * Find the exact model id to put in core-models.json, and check the two things that
 * silently break a Core tier if you get them wrong.
 *
 * Model ids are easy to almost-get-right, and both failure modes are quiet:
 *
 *   1. NOT IN models.dev  -> the model has no price row, so every request bills at its
 *      worst-case RESERVE instead of actual cost. Nothing errors. The lookup is
 *      case-sensitive: `MiniMax-M3` is not `minimax-m3`.
 *   2. WIRE ID NOT ON OPENROUTER -> an unrouted tier still forwards to OpenRouter, so
 *      the tier is broken before its cutover and has no rollback target after it.
 *      OpenRouter spells Z.ai `z-ai`, and does not carry Kimi K3 at all.
 *
 * Live provider /models is consulted too when a key is present, since a vendor can ship
 * a model before models.dev indexes it — that is exactly the case where you would
 * otherwise paste an id that quietly bills at the reserve.
 *
 * Usage:
 *   node scripts/pick-core-model.mjs                      # every provider, recommended pick
 *   node scripts/pick-core-model.mjs deepseek             # one provider, all its models
 *   node scripts/pick-core-model.mjs zai glm-5.2          # verify one id + emit config
 *   node scripts/pick-core-model.mjs --check              # audit core-models.json, exit 1 on problems
 *
 * Keys are read from the environment (or an --env-file) and are NEVER printed. Pass
 * --env-file=../Atlarix/.env to reuse the ones you already have.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE_MODELS_PATH = path.join(HERE, "..", "core-models.json");
const MODELS_DEV_URL = "https://models.dev/api.json";

/**
 * The five providers Core can route to.
 *
 * `modelsDevId` is separate from `id` because they disagree: models.dev files Qwen
 * under `alibaba` and Moonshot under `moonshotai`. `openRouterVendor` is the prefix
 * OpenRouter uses, which is what makes a wire id valid for the rollback path.
 */
const PROVIDERS = {
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    modelsDevId: "deepseek",
    openRouterVendor: "deepseek",
    listPath: "/models",
  },
  zai: {
    label: "Z.ai (GLM)",
    // PAYG. A Z.ai *coding plan* is a different host: /api/coding/paas/v4
    baseUrl: "https://api.z.ai/api/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    modelsDevId: "zai",
    openRouterVendor: "z-ai",
    listPath: "/models",
  },
  moonshot: {
    label: "Moonshot (Kimi)",
    baseUrl: "https://api.moonshot.ai/v1",
    apiKeyEnv: "MOONSHOT_API_KEY",
    modelsDevId: "moonshotai",
    openRouterVendor: "moonshotai",
    listPath: "/models",
  },
  qwen: {
    label: "Qwen (DashScope Intl)",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "DASHSCOPE_API_KEY",
    modelsDevId: "alibaba",
    openRouterVendor: "qwen",
    listPath: "/models",
  },
  minimax: {
    label: "MiniMax",
    baseUrl: "https://api.minimax.io/v1",
    apiKeyEnv: "MINIMAX_API_KEY",
    modelsDevId: "minimax",
    openRouterVendor: "minimax",
    listPath: "/models",
  },
};

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
const envFileArg = args.find((a) => a.startsWith("--env-file="));

/** Load KEY=value lines into process.env without printing anything. */
function loadEnvFile(file) {
  if (!existsSync(file)) {
    console.error(`env file not found: ${file}`);
    return;
  }
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}
if (envFileArg) loadEnvFile(path.resolve(envFileArg.slice("--env-file=".length)));

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** models.dev rows for one provider, keyed by the vendor's own model id. */
function rowsFor(catalog, provider) {
  return catalog[provider.modelsDevId]?.models ?? {};
}

function fmtUsd(n) {
  return typeof n === "number" ? `$${n}` : "—";
}

function fmtCtx(n) {
  if (!n) return "—";
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`;
}

function reasoningSummary(row) {
  if (row.reasoning !== true) return "no";
  const opts = Array.isArray(row.reasoning_options) ? row.reasoning_options : [];
  if (opts.length === 0) return "native (no parameter)";
  const effort = opts.find((o) => o.type === "effort");
  if (effort?.values) return `effort [${effort.values.join(",")}]`;
  if (opts.some((o) => o.type === "budget_tokens")) return "budget_tokens";
  if (opts.some((o) => o.type === "toggle")) return "toggle";
  return opts.map((o) => o.type).join(",");
}

/**
 * Rank candidates the way Core wants them: the largest context first, then the dearest
 * (a proxy for capability within one family), so the "best" model floats to the top.
 */
function rankModels(rows) {
  return Object.entries(rows)
    .filter(([, r]) => r.status !== "deprecated" && r.tool_call !== false)
    .sort((a, b) => {
      const ctx = (b[1].limit?.context ?? 0) - (a[1].limit?.context ?? 0);
      if (ctx !== 0) return ctx;
      return (b[1].cost?.input ?? 0) - (a[1].cost?.input ?? 0);
    });
}

/** Live ids straight from the provider, when a key is available. */
async function liveModelIds(provider) {
  const key = process.env[provider.apiKeyEnv];
  if (!key) return { ids: null, reason: `no ${provider.apiKeyEnv} in env` };
  try {
    const json = await fetchJson(`${provider.baseUrl}${provider.listPath}`, {
      Authorization: `Bearer ${key}`,
    });
    const list = Array.isArray(json?.data) ? json.data : [];
    const ids = list.map((m) => m?.id).filter((id) => typeof id === "string");
    return { ids, reason: null };
  } catch (e) {
    return { ids: null, reason: e instanceof Error ? e.message : String(e) };
  }
}

function configSnippet(providerId, provider, apiModelId, row) {
  const wireId = `${provider.openRouterVendor}/${apiModelId}`;
  // DeepSeek is the only one of the five with a documented cache-hit field today.
  const cacheHitField =
    providerId === "deepseek" ? '"prompt_cache_hit_tokens"' : "null";
  return [
    `  "models":   { "core-N": "${wireId}" },`,
    `  "routing":  { "core-N": { "provider": "${providerId}", "apiModelId": "${apiModelId}", "cacheHitField": ${cacheHitField} } },`,
    `  "providers": { "${providerId}": { "baseUrl": "${provider.baseUrl}", "apiKeyEnv": "${provider.apiKeyEnv}", "protocol": "openai", "balanceEndpoint": null } }`,
    row?.limit?.context
      ? `  // context ${fmtCtx(row.limit.context)} · in ${fmtUsd(row.cost?.input)} · out ${fmtUsd(row.cost?.output)} · reasoning ${reasoningSummary(row)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const catalog = await fetchJson(MODELS_DEV_URL);
  const openRouterIds = new Set(Object.keys(catalog.openrouter?.models ?? {}));

  if (flags.has("--check")) return audit(catalog, openRouterIds);

  const [providerArg, modelArg] = positional;
  const targets = providerArg
    ? [providerArg]
    : Object.keys(PROVIDERS);

  for (const id of targets) {
    const provider = PROVIDERS[id];
    if (!provider) {
      console.error(`Unknown provider "${id}". Known: ${Object.keys(PROVIDERS).join(", ")}`);
      process.exitCode = 1;
      continue;
    }

    const rows = rowsFor(catalog, provider);
    const ranked = rankModels(rows);
    const live = await liveModelIds(provider);

    console.log(`\n${"━".repeat(74)}`);
    console.log(`${provider.label}  (provider id: ${id})`);
    console.log(`  base URL : ${provider.baseUrl}`);
    console.log(`  key env  : ${provider.apiKeyEnv}${process.env[provider.apiKeyEnv] ? " (present)" : " (NOT SET)"}`);
    console.log(`  catalog  : models.dev/${provider.modelsDevId} — ${ranked.length} usable model(s)`);
    if (live.ids) console.log(`  live API : ${live.ids.length} model(s) reported`);
    else console.log(`  live API : not queried — ${live.reason}`);
    console.log("━".repeat(74));

    if (modelArg) {
      verifyOne(id, provider, modelArg, rows, openRouterIds, live);
      continue;
    }

    const show = providerArg ? ranked : ranked.slice(0, 5);
    for (const [modelId, row] of show) {
      const onOr = openRouterIds.has(`${provider.openRouterVendor}/${modelId}`);
      const onLive = live.ids ? live.ids.includes(modelId) : null;
      console.log(
        `  ${modelId.padEnd(24)} ctx ${fmtCtx(row.limit?.context).padEnd(6)} ` +
          `in ${String(fmtUsd(row.cost?.input)).padEnd(8)} out ${String(fmtUsd(row.cost?.output)).padEnd(8)} ` +
          `${reasoningSummary(row).padEnd(22)} ` +
          `${onOr ? "OR✓" : "OR✗"}${onLive === null ? "" : onLive ? " live✓" : " live✗"}`,
      );
    }
    if (!providerArg && ranked.length > show.length) {
      console.log(`  … ${ranked.length - show.length} more — run: node scripts/pick-core-model.mjs ${id}`);
    }

    // Models the vendor serves but models.dev has not indexed. These are the ones that
    // would silently bill at the reserve if pasted into config.
    if (live.ids) {
      const missing = live.ids.filter((mid) => !(mid in rows));
      if (missing.length > 0) {
        console.log(`\n  ⚠ live but NOT in models.dev (no price row → would bill at the reserve):`);
        console.log(`    ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? ", …" : ""}`);
      }
    }

    const [bestId, bestRow] = ranked[0] ?? [];
    if (bestId) {
      console.log(`\n  Recommended (largest context): ${bestId}`);
      console.log(configSnippet(id, provider, bestId, bestRow));
    }
  }

  console.log(
    `\nOR✓/OR✗ = whether the wire id exists on OpenRouter. OR✗ means an unrouted tier ` +
      `is broken\nand has no rollback target — route it direct in the same commit.\n`,
  );
}

function verifyOne(providerId, provider, apiModelId, rows, openRouterIds, live) {
  const row = rows[apiModelId];
  const wireId = `${provider.openRouterVendor}/${apiModelId}`;
  let ok = true;

  if (row) {
    console.log(`  ✓ in models.dev — priced, context ${fmtCtx(row.limit?.context)}`);
    console.log(`      in ${fmtUsd(row.cost?.input)} · out ${fmtUsd(row.cost?.output)} · cache ${fmtUsd(row.cost?.cache_read)}`);
    console.log(`      reasoning: ${reasoningSummary(row)} · temperature: ${row.temperature === false ? "NOT accepted" : "accepted"}`);
  } else {
    ok = false;
    const near = Object.keys(rows).filter(
      (k) => k.toLowerCase() === apiModelId.toLowerCase(),
    );
    console.log(`  ✗ NOT in models.dev — no price row, so this would bill at the RESERVE.`);
    if (near.length) console.log(`      Case mismatch? models.dev spells it: ${near.join(", ")}`);
  }

  if (openRouterIds.has(wireId)) {
    console.log(`  ✓ wire id "${wireId}" exists on OpenRouter — rollback works`);
  } else {
    console.log(`  ⚠ wire id "${wireId}" is NOT on OpenRouter — no rollback target.`);
    console.log(`      Route this tier direct in the SAME commit that adds it.`);
  }

  if (live.ids) {
    console.log(
      live.ids.includes(apiModelId)
        ? `  ✓ the provider's own /models lists it`
        : `  ⚠ the provider's /models does NOT list it — check the id or your plan`,
    );
  }

  console.log(`\n  Config:\n${configSnippet(providerId, provider, apiModelId, row)}`);
  if (!ok) process.exitCode = 1;
}

/** Audit every tier already in core-models.json. */
function audit(catalog, openRouterIds) {
  const cfg = JSON.parse(readFileSync(CORE_MODELS_PATH, "utf8"));
  const models = cfg.models ?? {};
  const routing = cfg.routing ?? {};
  let problems = 0;

  console.log(`Auditing ${Object.keys(models).length} configured tier(s)\n`);
  for (const [tier, wireId] of Object.entries(models)) {
    const route = routing[tier];
    console.log(`${tier}: ${wireId}${route ? "  → direct" : "  → OpenRouter (unrouted)"}`);

    if (!openRouterIds.has(wireId) && !route) {
      console.log(`  ✗ unrouted AND not on OpenRouter — this tier cannot serve a request`);
      problems++;
    }
    if (!route) {
      console.log(`  · no routing entry yet (fine pre-cutover)`);
      continue;
    }
    const provider = PROVIDERS[route.provider];
    if (!provider) {
      console.log(`  ✗ unknown provider "${route.provider}"`);
      problems++;
      continue;
    }
    const row = rowsFor(catalog, provider)[route.apiModelId];
    if (!row) {
      console.log(`  ✗ apiModelId "${route.apiModelId}" not in models.dev/${provider.modelsDevId} — bills at the RESERVE`);
      problems++;
    } else {
      console.log(`  ✓ priced · ctx ${fmtCtx(row.limit?.context)} · ${reasoningSummary(row)}`);
    }
    const declared = cfg.providers?.[route.provider];
    if (!declared) {
      console.log(`  ✗ no providers["${route.provider}"] block`);
      problems++;
    } else if (declared.apiKeyEnv !== provider.apiKeyEnv) {
      console.log(`  ⚠ apiKeyEnv is "${declared.apiKeyEnv}"; expected "${provider.apiKeyEnv}"`);
    }
  }

  console.log(problems === 0 ? "\nNo problems found." : `\n${problems} problem(s) found.`);
  if (problems > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
