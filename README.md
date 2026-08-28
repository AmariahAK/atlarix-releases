# Atlarix Releases

This is the **official release repository** for [Atlarix](https://atlarix.dev) — the agent workstation built for the open-weight frontier. Managed cloud models via Atlarix Core, your own API keys across 145+ providers, and local models — deep research, code generation, and debugging without replacing your editor.

**Main website:** [atlarix.dev](https://atlarix.dev)  
**Built by:** [Norah Labs](https://norahlabs.com/)

---

## What this repo is for

- **Download centre:** The [Atlarix website](https://atlarix.dev) uses this repo as the source for the latest installers and release notes.
- **Releases:** Official binaries (macOS, Linux, **Windows**) are published here via GitHub Actions from the main Atlarix app repository. *Windows builds are currently **unsigned** (EV/OV code signing is in progress) — Windows Defender SmartScreen will show a warning before install; this is expected. Click "More info" → "Run anyway" to proceed.*
- **Community:** You can open **Issues** for bug reports and **Discussions** (if enabled) for ideas and feedback.

## Headless agent (benchmarking / CI)

Most users want the desktop app above. If you want to **run the Atlarix agent from the command line** — for benchmarking (Terminal-Bench, SWE-bench), CI, or unattended tasks — there's a prebuilt headless bundle.

- **Download:** [`atlarix-headless-<version>.tar.gz`](https://github.com/AmariahAK/atlarix-releases/releases/tag/headless-bench) from the **headless-bench** release. It's an Electron-free Node bundle (`linux/amd64`, runtime-only) that drives the real agent loop. Requires **Node 20+**.
- **Unpack:** `mkdir -p /opt/atlarix && tar -xzf atlarix-headless-*.tar.gz -C /opt/atlarix`

**Run a task** against a provider's own API — the recommended path, and the one Atlarix
Core itself uses. Use your key straight from the provider; note the model id here is the
vendor's own (`deepseek-v4-pro`), not a gateway-prefixed one:

```bash
export DEEPSEEK_API_KEY="sk-..."
node /opt/atlarix/dist-headless/atlarix-headless.mjs \
  --workspace /path/to/repo \
  --prompt-file task.md \
  --provider-url https://api.deepseek.com \
  --model deepseek-v4-pro \
  --api-key "$DEEPSEEK_API_KEY"
```

The same shape works for any OpenAI-compatible endpoint — swap the base URL and model:

| Provider | `--provider-url` | `--model` |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | `deepseek-v4-pro` |
| Z.ai (GLM) | `https://api.z.ai/api/paas/v4` | `glm-5.3` |
| Moonshot (Kimi) | `https://api.moonshot.ai/v1` | `kimi-k3` |
| Local Ollama | `http://localhost:11434/v1` | whatever you have pulled |

**Or through OpenRouter**, pinned to one provider — useful when a comparison needs
byte-identical weights and precision across runs:

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
node /opt/atlarix/dist-headless/atlarix-headless.mjs \
  --workspace /path/to/repo \
  --prompt-file task.md \
  --provider-id openrouter \
  --model deepseek/deepseek-v4-pro \
  --api-key "$OPENROUTER_API_KEY" \
  --openrouter-provider '{"order":["deepinfra"],"allow_fallbacks":false}'
```

| Flag | Env var | Default | Notes |
| --- | --- | --- | --- |
| `--workspace <dir>` | — | cwd | Repo to work on |
| `--prompt <text>` / `--prompt-file <path>` | `ATLARIX_HEADLESS_PROMPT` | — | The task (one is required) |
| `--provider-id <id>` | `ATLARIX_HEADLESS_PROVIDER_ID` | `openrouter` | Built-in provider |
| `--provider-url <url>` | `ATLARIX_HEADLESS_PROVIDER_URL` | — | Custom OpenAI-compatible base URL |
| `--model <name>` | `ATLARIX_HEADLESS_MODEL` | `deepseek/deepseek-v4-pro` | Model id |
| `--api-key <key>` | `ATLARIX_HEADLESS_API_KEY` | — | Provider key (plaintext) |
| `--openrouter-provider <json>` | `ATLARIX_OPENROUTER_PROVIDER_JSON` | — | OpenRouter routing pin (OpenRouter only) |
| `--mode build\|ask` | — | `build` | `build` = autonomous coding, `ask` = read-only |
| `--timeout <ms>` | `ATLARIX_HEADLESS_TIMEOUT_MS` | `600000` | Wall-clock timeout |

Exit code **0** = the agent completed the turn; **1** = timeout/error; **2** = bad arguments. The headless bundle auto-approves file/command operations (it's unattended), forces native function-calling, and drops browser tools.

## Atlarix Core models

[`core-models.json`](core-models.json) is the live mapping of the four **Atlarix Core** tiers to the underlying models they run on. The desktop app reads this file at startup (and hourly), so the Core models can be updated here **without shipping a new app release**.

The models currently powering Atlarix Core:

<!-- CORE_MODELS:START (auto-generated from core-models.json — do not edit by hand) -->
| Tier | Model |
| --- | --- |
| Core 1 | `z-ai/glm-5.2` |
| Core 2 | `deepseek/deepseek-v4-pro` |
<!-- CORE_MODELS:END -->

This table is generated from `core-models.json` by a GitHub Action — edit only the JSON and the table updates itself. (No API keys live here; only model identifiers.)

## What's new notes

[`updates.json`](updates.json) is the short note the desktop app shows in its bottom-left "what's new" panel. It is published here rather than bundled into the app for one reason: **a note bundled into a release only reaches people who have already updated**, which is backwards for telling someone an update exists.

Each entry is `{ id, title, body, link, linkLabel }`. The app shows the FIRST entry and remembers the `id` it dismissed, so:

- Editing an entry's text **does not** bring the panel back for someone who dismissed it. That is deliberate — a typo fix is not news.
- Adding a new entry with a **new `id`** surfaces the panel again for everyone.
- Reusing an old `id` is the one thing to avoid: it will stay dismissed for exactly the people who have seen the least of it.

`node scripts/check-updates.mjs` checks the file against the rules the app applies, and CI runs it on every pull request that touches it. That check exists because the app's failure mode here is **silence**: on anything it cannot use it renders nothing, deliberately, so a missing field or an `http://` link looks exactly like "there is no note right now".

Keep `body` to a line or two. The moment it wants scrolling it has become the changelog, and [there already is one](https://www.atlarix.dev/changelog). The app ships no bundled copy of this file and renders **nothing** if the fetch fails — an empty panel is worse than no panel.

## Links

- [Atlarix](https://atlarix.dev) — product and download page  
- [Norah Labs](https://norahlabs.com/) — builders of Atlarix  
- [Security policy](SECURITY.md) — how to report vulnerabilities  
- [License](LICENSE) — end-user license agreement  

## Research

A technical paper on the research behind Atlarix's context-management design has been published on Zenodo:

**Blueprint: Section-Scoped Structural Graph Retrieval and Post-Turn Compression for Agentic LLM Coding in Multi-Repository Workspaces**  
Amariah Kamau — May 2026  
DOI: [10.5281/zenodo.20381860](https://doi.org/10.5281/zenodo.20381860)  
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20381860.svg)](https://doi.org/10.5281/zenodo.20381860)

If you are evaluating Atlarix for a large or multi-repository codebase, this paper documents the technical evidence for its multi-repo exploration approach. The shipping app uses bundled ripgrep for fast, index-free retrieval.

**Benchmarks:** [**atlarix.dev/benchmark**](https://atlarix.dev/benchmark) is the official home for all Atlarix benchmark work — every comparison (Terminal-Bench and beyond), with raw result files, full reproduction steps, and honest framing. It's updated as we add more models and tests, so check there for the current results rather than a snapshot here.

---

## Contributing

Atlarix is closed-source, but you can contribute to the ecosystem:

**Skills Registry** — Atlarix ships with a community-maintained open-source skill registry. If you build a skill that makes Atlarix better at a language, framework, or workflow pattern, contribute it at:

👉 **[github.com/AmariahAK/atlarix-skills](https://github.com/AmariahAK/atlarix-skills)**

**MCP registry** — Curated Model Context Protocol listings for the Atlarix marketplace:

👉 **[github.com/AmariahAK/atlarix-mcps](https://github.com/AmariahAK/atlarix-mcps)**

The desktop app repository (not open source) lives at **[github.com/AmariahAK/Atlarix](https://github.com/AmariahAK/Atlarix)** and publishes installers here via automation.

---

*Atlas + Axis + Intelligence*
