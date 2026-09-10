# Atlarix Releases

## The private AI workstation for engineering teams

**[Atlarix](https://atlarix.dev)** is a desktop agent workstation for macOS, Linux and
Windows. It plans, builds, reviews, tests and refines — and it keeps notes on your
codebase, so it gets sharper on your system the longer you use it. It does not replace
your editor.

**What "private" means here:** your code stays on your machine. Nothing indexes your repo,
no embeddings are built, no file contents are sent as telemetry, and nothing changes on
disk without your approval.

**Atlarix is free.** Every feature is available to everyone; what you pay for is Atlarix
Core inference, metered as you use it. Run a model three ways — **Atlarix Core** (managed,
routed through our proxy: not logged, not retained), **your own API key** across
<!-- CATALOG_COUNTS:START (auto-generated from models.dev — do not edit by hand) -->210+ providers and 6,500+ tool-capable models<!-- CATALOG_COUNTS:END -->,
or a **local model** via Ollama or LM Studio. The last two never touch our
infrastructure, and are metered by nobody.

**Download:** [atlarix.dev](https://atlarix.dev) · **Built by:**
[Norah Labs](https://norahlabs.com/)

---

## What this repo is

This is the **official release repository** — the download centre, not the source. The
[Atlarix website](https://atlarix.dev) reads it for the latest installers and release
notes.

- **[Releases](https://github.com/AmariahAK/atlarix-releases/releases)** — official binaries for macOS, Linux and Windows,
  published here by automation from the app repository.
- **Two live config files** — [`core-models.json`](core-models.json) and
  [`updates.json`](updates.json). Both go live to every installed client within the hour,
  with no app release in between.
- **[Issues](https://github.com/AmariahAK/atlarix-releases/issues)** and **[Discussions](https://github.com/AmariahAK/atlarix-releases/discussions)** — bugs, ideas and
  feedback. Security reports go to the [security policy](docs/SECURITY.md) instead.

> **The direct Windows `.exe` shows a SmartScreen warning.** It is currently **unsigned**
> (EV/OV code signing is in progress), so Defender will prompt before install — click
> "More info" → "Run anyway". The
> [**Microsoft Store build**](https://apps.microsoft.com/detail/9p3rr11dvzpw) is signed by
> Microsoft and installs with no warning, and the macOS download is notarized.

## Docs

| | |
| --- | --- |
| [**Core models**](docs/CORE-MODELS.md) | The current Core lineup, and why a slot is not a model |
| [**Headless agent (CLI)**](docs/HEADLESS.md) | `npm install -g atlarix` — every flag, and the two settings that decide whether a benchmark number means anything |
| [**Research & benchmarks**](docs/RESEARCH.md) | The Zenodo paper, and where the real benchmark numbers live |
| [**Contributing**](CONTRIBUTING.md) | Skills, the MCP registry, and what this repo is not |
| [**Security policy**](docs/SECURITY.md) | How to report a vulnerability |
| [**License**](docs/LICENSE.md) | End-user license agreement |
| [**What's-new notes**](docs/UPDATES.md) | Maintainer notes on `updates.json` |
| [**Core cutover**](docs/CORE-CUTOVER.md) | Maintainer runbook for moving a Core tier to a provider's own API |

---

*Atlas + Axis + Intelligence*
