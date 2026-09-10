# Atlarix Core models

**Atlarix Core** is the managed option: you send a request, Atlarix routes it through its
own authenticated proxy to the provider that serves the model, and you are billed for the
inference. Nothing is logged or retained by us; the provider handles it under their own
data policy. It is one of three ways to run Atlarix — the other two are your own API key
and a local model, and neither of those touches our infrastructure at all.

[`core-models.json`](../core-models.json) is the live mapping of Core **slots** to the
models behind them.

## The current lineup

<!-- CORE_MODELS:START (auto-generated from core-models.json — do not edit by hand) -->
| Tier | Model |
| --- | --- |
| Core 1 | `z-ai/glm-5.3` |
| Core 2 | `openai/gpt-5.6-terra` |
| Core 3 | `openai/gpt-6-astra` |
<!-- CORE_MODELS:END -->

Generated from `core-models.json` by `scripts/gen-readme-models.mjs`. Edit only the JSON:
the sync job rewrites this table after every merge that touches it, so the two cannot drift
apart. (No API keys live in this repo — only model identifiers.)

For each model's context window and pricing, see
[atlarix.dev/docs/guides/core-models](https://www.atlarix.dev/docs/guides/core-models),
which is derived from this same file.

## A slot is not a model

This is the part worth understanding, because it is why the table above can change while
your installed app does not.

A slot names a **position in the picker**, never a particular model. The desktop app reads
this file at startup and hourly; the proxy re-reads it every ten minutes. So the lineup
can be changed here and every installed client picks it up **without a new app release**,
and without you updating anything.

Two consequences:

- **It is a map, not a fixed four.** An unconfigured slot is empty everywhere — the app,
  the proxy, the website — so the lineup is exactly what this file names and no more. This
  repo used to advertise four Core models while two were configured; that is why the table
  is generated rather than written.
- **When the model behind a slot changes, the app tells you.** A slot quietly answering in
  a different voice is worse than a slot that changed and said so.

## Every model is available on every plan

There is no tier gating: no Core model is reserved, and there is no plan that unlocks one.
Atlarix itself is free — what you pay for is Core inference, metered as you use it. Bring
your own key or run a local model and you are metered by nobody.

## Related

- [Core direct-provider cutover](CORE-CUTOVER.md) — the operator runbook for moving a tier
  to a provider's own API, with the routing table and the rollback.
