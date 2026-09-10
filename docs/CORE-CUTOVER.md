# Core direct-provider cutover

How to move an Atlarix Core tier from OpenRouter to its provider's own API, one tier
at a time, with a one-line rollback.

`core-models.json` is read live by **every installed client** (hourly) and by the proxy
(every 10 min). Nothing here needs an app release or a proxy redeploy.

## Prerequisites (once)

1. **`SUPABASE_JWKS_URL`** set in Railway. The proxy **refuses to boot** without it (or
   `SUPABASE_JWT_SECRET`) — deploying first would take Core down for everyone.
   This project is asymmetric (ES256), so the value is
   `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`. It is a public,
   verify-only endpoint — not a secret.
2. **Provider key** for the tier you are cutting over, in Railway. Only the providers
   named in `routing` need one; a tier whose key is missing returns
   `core_unavailable` and alerts, rather than silently billing via OpenRouter.
3. Proxy deployed from the direct-provider branch, and `/health` green.

## Per-tier flip

Add one entry under `routing`. That is the whole change.

```jsonc
"routing": {
  "core-3": {
    "provider": "openai",                // must match a `providers` key
    "apiModelId": "gpt-5.6-terra",       // the VENDOR's own id
    "cacheHitField": null                // see the cache note below
  }
}
```

Leave `models` alone. The `vendor/model` value stays the wire id: the proxy allowlist
keys on it and rewrites it to `apiModelId` on the way out, which is what lets clients
that haven't updated keep working.

**`apiModelId` must match models.dev's spelling exactly, including case.** It is the
key for price and context-window lookup. `MiniMax-M3` is capitalised while the wire id
is `minimax/minimax-m3`; getting this wrong loses that tier's price (it then bills at
the worst-case reserve) and its 1M context window.

Both tiers ship routed direct. Core does not use OpenRouter at all any more — the only
OpenRouter traffic left in the product is a user's own BYOK key, which never reaches this
proxy.

## The lineup

<!-- CORE_ROUTING:START (auto-generated from core-models.json — do not edit by hand) -->
| Slot | Provider | Wire id | API model id | Key |
| --- | --- | --- | --- | --- |
| core-1 | `zai` | `z-ai/glm-5.3` | `glm-5.3` | `ZHIPU_API_KEY` |
| core-2 | `openai` | `openai/gpt-5.6-terra` | `gpt-5.6-terra` | `OPENAI_API_KEY` |
| core-3 | `openai` | `openai/gpt-6-astra` | `gpt-6-astra` | `OPENAI_API_KEY` |
<!-- CORE_ROUTING:END -->

The **API model id** column is what the provider is actually called with; the **wire id**
is what the app and models.dev know the model by. This table used to be typed by hand and
went stale exactly the way you would expect — it named `openai/gpt-5.6-sol` for core-3 for
days after the JSON had moved to a GPT-6. It is now rendered from `core-models.json` by
`scripts/gen-readme-models.mjs`, which the sync job runs on every merge that touches the
JSON — so the only way to change this table is to change the config it describes.

All on PAYG APIs — a Z.ai *coding plan* is a different base URL
(`.../api/coding/paas/v4`), so do not mix them up.

Slot 4 simply has no key in `models`, which every layer reads as EMPTY. (A parked slot may
also carry the `TBA` sentinel — that exists because GitHub Actions secrets cannot hold an
empty value — but the live config just omits it.) Adding a fourth model is one `models`
entry plus one `routing` entry — no release.

**core-2 is the DEFAULT tier, not core-1.** Anything needing "a Core model" with no
opinion resolves core-2 first (`DEFAULT_CORE_TIER_ORDER` in the app), so a new user's first
turn runs on GPT. Slot order remains the display order. The Reviewer is the exception and
still takes the lowest-numbered tier, which keeps reviews on GLM at roughly 39c each.

**Core no longer has a cheap tier.** GLM 5.3 ($1.40/$4.40) is now the floor; Terra is
$2.00/$12.00 and Sol $4.00/$20.00, against the DeepSeek V4 Pro they replaced at
$0.435/$0.87. Measured 2–29c turns become roughly 50c on Terra and 90c on Sol. That is
deliberate: with the $1 signup trial removed, users fund their own inference.

**The GPT tiers accept image and PDF input** — the first Core models that do. This needs no
configuration: images were never gated, and the PDF gate reads models.dev per-model and
resolves through the `openai/` wire-id prefix. GLM 5.3 remains text-only.

**OpenAI rejects `max_tokens`.** Its reasoning models answer
`400 unsupported_parameter: Use 'max_completion_tokens' instead`, so the proxy renames the
field for OpenAI-routed tiers only (`sanitizeForDirectProvider`). Every other direct
provider still wants the classic name — do not widen that rename to `protocol: "openai"`,
which they all declare.

## Verifying a model id before you paste it

`node scripts/pick-core-model.mjs` checks the two things that fail SILENTLY — whether the
id exists in models.dev (no price row ⇒ that tier bills at its worst-case reserve) and
whether the wire id exists on OpenRouter. That second check is now advisory rather than a
rollback guarantee — see Rollback below — but it still catches a fabricated id. Run
`node scripts/pick-core-model.mjs --check` to audit whatever is currently configured; it
exits non-zero on a problem, so it can gate a deploy.

## Rollback

**THE OPENROUTER FALLBACK IS GONE (2026-09-08), so the old rollback no longer works.**
Deleting a tier's `routing` entry used to revert it to OpenRouter on the next refresh.
`COMPASS_OPENROUTER_API_KEY` has been removed from Railway — it had silently expired, and a
dead fallback is worse than none: it answered
`{"error":{"message":"User not found.","code":401}}`, which the client reported to the user
as their own expired Atlarix session. An unrouted tier now returns `core_unavailable` and
alerts, which is at least honest.

Rollback today is a config commit, and it is still fast because this file is served raw
from `main` with no build step:

- **Wrong model on a tier** — point `models[tier]` and `routing[tier].apiModelId` back.
- **A provider is down or its key is rejected** — repoint that tier at another provider
  already in `providers`, or drop the tier from `models` entirely, which every layer reads
  as EMPTY and which makes clients fall forward to a configured tier rather than fail.
- **Restoring the OpenRouter path** means setting the key again first. Until then, an
  unrouted tier does not degrade — it stops.

**That path is now switched off, and the reason is worth keeping.** It needed two things,
and one of them was lost silently:
- `COMPASS_OPENROUTER_API_KEY` set in Railway. It stopped being required at boot in July,
  so nothing failed when it expired — and nothing used it day to day, so nothing noticed.
  It has been removed deliberately (2026-09-08). An unrouted tier now returns
  `core_unavailable` and alerts, naming this as the cause.
- A wire id OpenRouter recognises. `z-ai/glm-5.3`, `openai/gpt-5.6-terra` and
  `openai/gpt-5.6-sol` all qualify, and wire ids are still kept OpenRouter-valid so the
  path can be switched back on by setting a key.

**The lesson, because it cost a debugging session:** a fallback nothing exercises is not
insurance, it is an untested branch that will fire exactly once, in production, at the
worst moment. This one had expired, and it failed with an auth error the client attributed
to the USER's session. If the OpenRouter path is ever restored, give it a periodic probe —
or accept that its first real use will also be its first test.

## `cacheHitField`, and why it must be decided at flip time

`cacheHitField` is not how caching happens — the provider caches on its own. It is where
that provider reports the cache-hit token count so we can bill it at the cheaper
`cache_read` rate instead of full input. The vendors disagree: DeepSeek puts it top-level
as `prompt_cache_hit_tokens`, OpenAI-compatible vendors nest it at
`prompt_tokens_details.cached_tokens`, and some report nothing at all.

`normalizeUsage` tries the configured field, then the OpenAI-standard nested path, then
zero — and a model with no catalog `cache_read` price falls back *up* to the full input
rate. So the failure mode is always a silently lost discount, never free tokens.

**Decide it while you have a live response in front of you.** Nothing logs the cached
token count or a field miss; the per-generation log line carries only a scalar total. Once
the flip is done there is no way to tell from the outside whether the field is right — the
only signal is `cents` sitting close to `reserved` on a prompt that should have hit cache.

Every live tier ships `null`, meaning they rely on the OpenAI-standard nested path, and
**both vendors have now been confirmed against real usage frames** (2026-09-08): Z.ai and
OpenAI each report `prompt_tokens_details.cached_tokens`. So `null` is correct here and
cached input is being discounted, not billed at full rate.

`cacheWriteField` stays `null` deliberately. models.dev carries no `cache_write` price for
these models, and `computeCostUsd` falls back to `max(input, cacheRead, output)` when a
price is missing — so setting the field would bill cache writes at the OUTPUT rate. Leaving
it unset bills them as ordinary input, which is the safe direction.

## `webSearch` is false on every tier

Core has no native web search once it leaves OpenRouter: no provider in the lineup
offers agentic search over a plain OpenAI-compatible chat endpoint. Core uses the
client SearxNG tool and the in-app browser instead.

These flags are set `false` for all tiers deliberately, and matter for clients that
have **not** updated: they would otherwise still ask for OpenRouter's server-side web
tool, whose `plugins` field the proxy strips — search would go silently dark rather
than falling back to SearxNG.

## What to verify after each flip

- The provider's dashboard shows the traffic.
- Proxy logs show `tokens=… cents=… reserved=…` per request, with `cents` well under
  `reserved`.
- **No** `no price row for …` warnings — that means the catalog lookup missed and the
  tier is billing at its reserve.
- Wallet debits reconcile against the provider's own reported spend over ~a day. This
  is the acceptance gate; nothing else proves the money path.
