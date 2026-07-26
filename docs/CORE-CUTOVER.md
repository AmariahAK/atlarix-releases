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

**core-3 DeepSeek → core-2 Z.ai/GLM → core-1 Moonshot/Kimi**

## The lineup

Three models, all on PAYG APIs (not coding subscriptions — that matters, a Z.ai coding
plan lives at a different base URL, `.../api/coding/paas/v4`):

| Slot | Model | Provider | models.dev id |
|---|---|---|---|
| core-1 | Kimi K3 | `moonshot` | `kimi-k3` |
| core-2 | GLM 5.2 | `zai` | `glm-5.2` |
| core-3 | DeepSeek V4 Pro | `deepseek` | `deepseek-v4-pro` |

There are four SLOTS in the code but the lineup is whatever `models` maps — an
unmapped slot is omitted from the picker entirely, so going to 2 or back to 4 is a
config edit with no code change.

All three are TEXT-ONLY. That is a deliberate trade: attachments route through the PDF
and file tools rather than a vision model. If image input becomes important, `zai`'s
`glm-5v-turbo` accepts image/video/pdf at $1.20/$4.00 (200K context, not 1M).

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
