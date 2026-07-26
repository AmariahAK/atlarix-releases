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

Recommended order — cheapest and best-understood first, each watched for a day against
the provider's own dashboard before the next:

**core-2 DeepSeek → core-1 Z.ai/GLM → (Kimi, when its billing is sorted)**

## The lineup

Launching with TWO models. Kimi is held back until its billing works — the code
supports 2, 3 or 4 and an unmapped slot is simply absent from the picker, so adding it
later is one `models` entry plus one `routing` entry.

| Slot | Model | Provider | Wire id | models.dev id |
|---|---|---|---|---|
| core-1 | GLM 5.2 | `zai` | `z-ai/glm-5.2` | `glm-5.2` |
| core-2 | DeepSeek V4 Pro | `deepseek` | `deepseek/deepseek-v4-pro` | `deepseek-v4-pro` |

All on PAYG APIs — a Z.ai *coding plan* would be a different base URL
(`.../api/coding/paas/v4`), so do not mix them up.

**Wire ids are OpenRouter-valid on purpose.** An unrouted tier still forwards to
OpenRouter, so a wire id OpenRouter does not recognise means that tier is broken before
its cutover AND has no rollback target after it. Note `z-ai/glm-5.2` — OpenRouter spells
Z.ai `z-ai`, not `zai`.

**Kimi K3 has no OpenRouter equivalent** (its catalog stops at k2.7-code). So when Kimi
is added it must be routed direct in the SAME commit — there is nothing to fall back to.

Both current models are text-only: attachments go through the PDF and file tools. If
image input becomes important, `zai`'s `glm-5v-turbo` takes image/video/pdf at
$1.20/$4.00 (200K context, not 1M).

## Rollback

Delete that tier's `routing` entry. It reverts to OpenRouter on the next refresh — no
redeploy, no release. Keep `COMPASS_OPENROUTER_API_KEY` in Railway for exactly this
reason.

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
