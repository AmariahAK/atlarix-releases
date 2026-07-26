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
    "provider": "deepseek",              // must match a `providers` key
    "apiModelId": "deepseek-v4-pro",     // the VENDOR's own id
    "cacheHitField": "prompt_cache_hit_tokens"
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

| Slot | Model | Provider | Wire id | models.dev id | Key |
|---|---|---|---|---|---|
| core-1 | GLM 5.2 | `zai` | `z-ai/glm-5.2` | `glm-5.2` | `ZHIPU_API_KEY` |
| core-2 | DeepSeek V4 Pro | `deepseek` | `deepseek/deepseek-v4-pro` | `deepseek-v4-pro` | `DEEPSEEK_API_KEY` |

Both on PAYG APIs — a Z.ai *coding plan* is a different base URL
(`.../api/coding/paas/v4`), so do not mix them up.

Slots 3 and 4 are parked as `TBA`, which every layer reads as EMPTY. They have to carry a
placeholder rather than an empty string because GitHub Actions secrets cannot hold an empty
value. Adding a third model is one `models` entry plus one `routing` entry — no release.

Both models are text-only: attachments go through the PDF and file tools. If image input
becomes important, `zai`'s `glm-5v-turbo` takes image/video/pdf at $1.20/$4.00 (200K
context, not 1M).

## Verifying a model id before you paste it

`node scripts/pick-core-model.mjs` checks the two things that fail SILENTLY — whether the
id exists in models.dev (no price row ⇒ that tier bills at its worst-case reserve) and
whether the wire id exists on OpenRouter (no rollback target). Run
`node scripts/pick-core-model.mjs --check` to audit whatever is currently configured; it
exits non-zero on a problem, so it can gate a deploy.

## Rollback

Delete that tier's `routing` entry and it reverts to OpenRouter on the next refresh — no
redeploy, no release.

That path needs two things to actually work, and both are easy to lose now that nothing
uses it day to day:
- `COMPASS_OPENROUTER_API_KEY` still set in Railway. It is no longer required at boot (the
  proxy starts fine without it), so an unrouted tier with no key returns
  `core_unavailable` and alerts, naming this as the cause.
- A wire id OpenRouter actually recognises. `z-ai/glm-5.2` and
  `deepseek/deepseek-v4-pro` both qualify — that is why wire ids are kept
  OpenRouter-valid even though Core no longer routes through it.

Keeping the key is cheap insurance. Dropping it makes rollback a redeploy.

## `webSearch` is false on every tier

Core has no native web search once it leaves OpenRouter: none of the four providers
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
