# Atlarix Releases

This is the **official release repository** for [Atlarix](https://atlarix.dev) — the open-weight frontier harness. Atlarix is the agent workstation built for the open-weight frontier labs (DeepSeek, Qwen, Kimi, MiniMax) — deep research, code generation, and debugging with any-model BYOK and local-first execution.

**Main website:** [atlarix.dev](https://atlarix.dev)  
**Built by:** [Norah Labs](https://norahlabs.com/)

---

## What this repo is for

- **Download centre:** The [Atlarix website](https://atlarix.dev) uses this repo as the source for the latest installers and release notes.
- **Releases:** Official binaries (macOS, Linux, **Windows**) are published here via GitHub Actions from the main Atlarix app repository. *Windows builds are currently **unsigned** (EV/OV code signing is in progress) — Windows Defender SmartScreen will show a warning before install; this is expected. Click "More info" → "Run anyway" to proceed.*
- **Community:** You can open **Issues** for bug reports and **Discussions** (if enabled) for ideas and feedback.

## Atlarix Core models

[`core-models.json`](core-models.json) is the live mapping of the four **Atlarix Core** tiers to the underlying models they run on. The desktop app reads this file at startup (and hourly), so the Core models can be updated here **without shipping a new app release**.

The models currently powering Atlarix Core:

| Tier | Model |
| --- | --- |
| Core 1 | `moonshotai/kimi-k2.6` |
| Core 2 | `qwen/qwen3.7-plus` |
| Core 3 | `deepseek/deepseek-v4-pro` |
| Core 4 | `minimax/minimax-m3` |

This table reflects the values in `core-models.json` — if that file changes, the models above change with it. (No API keys live here; only model identifiers.)

## Links

- [Atlarix](https://atlarix.dev) — product and download page  
- [Norah Labs](https://norahlabs.com/) — builders of Atlarix  
- [Security policy](SECURITY.md) — how to report vulnerabilities  
- [License](LICENSE) — end-user license agreement  

## Research

A technical paper documenting Atlarix's Blueprint context management system has been published on Zenodo:

**Blueprint: Section-Scoped Structural Graph Retrieval and Post-Turn Compression for Agentic LLM Coding in Multi-Repository Workspaces**  
Amariah Kamau — May 2026  
DOI: [10.5281/zenodo.20381860](https://doi.org/10.5281/zenodo.20381860)  
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20381860.svg)](https://doi.org/10.5281/zenodo.20381860)

If you are evaluating Atlarix for a large or multi-repository codebase, this paper documents the technical evidence behind the Blueprint system.

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
