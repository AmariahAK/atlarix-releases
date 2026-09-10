# Atlarix Releases

This is the **official release repository** for [Atlarix](https://atlarix.dev) — the private AI workstation. Managed cloud models via Atlarix Core, your own API keys across <!-- CATALOG_COUNTS:START (auto-generated from models.dev — do not edit by hand) -->210+ providers and 6,500+ tool-capable models<!-- CATALOG_COUNTS:END -->, and local models — deep research, code generation, and debugging without replacing your editor.

**Main website:** [atlarix.dev](https://atlarix.dev)  
**Built by:** [Norah Labs](https://norahlabs.com/)

---

## What this repo is for

- **Download centre:** The [Atlarix website](https://atlarix.dev) uses this repo as the source for the latest installers and release notes.
- **Releases:** Official binaries (macOS, Linux, **Windows**) are published here via GitHub Actions from the main Atlarix app repository. *Windows builds are currently **unsigned** (EV/OV code signing is in progress) — Windows Defender SmartScreen will show a warning before install; this is expected. Click "More info" → "Run anyway" to proceed.*
- **Community:** You can open **Issues** for bug reports and **Discussions** (if enabled) for ideas and feedback.

## Headless agent (CLI)

The Atlarix agent loop as a command-line tool — for benchmarks, CI and unattended runs.
Install it from npm:

```bash
npm install -g atlarix
```

**→ [Full guide: docs/HEADLESS.md](docs/HEADLESS.md)** — install (npm or Linux tarball),
every flag, and the two settings that quietly decide whether a benchmark number means
anything.

## Atlarix Core models

[`core-models.json`](core-models.json) is the live mapping of the **Atlarix Core** slots to the underlying models they run on. It is a map, not a fixed four — an unconfigured slot is empty everywhere, so the lineup is exactly what the file names and no more. The desktop app reads it at startup (and hourly) and the proxy every ten minutes, so the Core models can be updated here **without shipping a new app release**.

The models currently powering Atlarix Core:

<!-- CORE_MODELS:START (auto-generated from core-models.json — do not edit by hand) -->
| Tier | Model |
| --- | --- |
| Core 1 | `z-ai/glm-5.3` |
| Core 2 | `openai/gpt-5.6-terra` |
| Core 3 | `openai/gpt-6-astra` |
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
- [Security policy](docs/SECURITY.md) — how to report vulnerabilities  
- [License](docs/LICENSE.md) — end-user license agreement  

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

**Skills** — A skill is a markdown file in your repo, under `.atlarix/skills/`, that teaches Atlarix a repeatable job: a release checklist, a review rubric, the way your team writes migrations. Atlarix sees each skill's name and description on every turn and reads the whole file only when that job comes up, so a workspace can hold as many as it likes without them costing prompt space.

Write one yourself, or ask Atlarix to write it for you and commit it alongside your project docs. They travel with the repo, so everyone working in it gets the same behaviour — which is why there is no central registry to install from any more: the useful skills turned out to be the ones specific to a codebase, not the generic ones.

**MCP registry** — Curated Model Context Protocol listings for the Atlarix marketplace:

👉 **[github.com/AmariahAK/atlarix-mcps](https://github.com/AmariahAK/atlarix-mcps)**

The desktop app repository (not open source) lives at **[github.com/AmariahAK/Atlarix](https://github.com/AmariahAK/Atlarix)** and publishes installers here via automation.

---

*Atlas + Axis + Intelligence*
