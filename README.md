# Atlarix Releases

## The private AI workstation for engineering teams

**[Atlarix](https://atlarix.dev)** is a desktop agent workstation for macOS, Linux and
Windows. It plans, builds, reviews, tests and refines — and it keeps notes on your
codebase, so it gets sharper on your system the longer you use it. It does not replace
your editor.

**What "private" means here:** your code stays on your machine. Nothing indexes your repo,
no embeddings are built, no file contents are sent as telemetry, and nothing changes on
disk without your approval.

**Atlarix is free.** Every feature is available to everyone. Start with **Atlarix Auto**,
which picks the best AI for each step of the job — no model to choose and no key to set up.
Or pick a model yourself: **Atlarix Core** (managed, routed through our proxy: not logged,
not retained), **your own API key** across
<!-- CATALOG_COUNTS:START (auto-generated from models.dev — do not edit by hand) -->220+ providers and 7,000+ tool-capable models<!-- CATALOG_COUNTS:END -->,
or a **local model** via Ollama or LM Studio. The last two never touch our
infrastructure, and are metered by nobody.

**Download:** [atlarix.dev](https://atlarix.dev) · **Built by:**
[Norah Labs](https://norahlabs.com/)

---

## The Atlarix family

| | What it is | Get it |
| --- | --- | --- |
| **Desktop app** | The agent workstation for macOS, Linux and Windows | [atlarix.dev](https://atlarix.dev) |
| **[Atlarix CLI](https://atlarix.dev/cli)** | The same agent in your terminal, sharing the app's sessions, keys and settings; `atlarix run` for CI and scripts | see below |
| **[Cloud agent](https://atlarix.dev/cloud-agent)** | Ask from Slack or the web; Atlarix works in your repository's own GitHub Actions and opens a pull request | [atlarix.dev/cloud](https://atlarix.dev/cloud) · [the Action](https://github.com/AmariahAK/atlarix-agent-action) |
| **[Atlarix Reviewer](https://atlarix.dev/reviewer)** | Reviews pull requests on GitHub; reads the diff, never runs your code | [atlarix.dev/reviewer](https://atlarix.dev/reviewer) |
| **[Chrome extension](https://atlarix.dev/extension)** | Lets the agent open and test pages in your own browser | Chrome Web Store |

### Install the CLI

```bash
curl -fsSL https://atlarix.dev/install | sh          # macOS, Linux
irm https://atlarix.dev/install.ps1 | iex             # Windows (PowerShell)
brew install amariahak/atlarix/atlarix                # Homebrew
npm install -g atlarix                                # npm
```

Then run `atlarix` in any project folder. winget (`AmariahAK.AtlarixCLI`) is in review.

## FAQ

**What is Atlarix?** An AI coding agent: it plans, builds, reviews and tests code with you. It
runs as a desktop app, a terminal CLI, a cloud agent in GitHub Actions, and a pull-request
reviewer.

**Which models does it use?** Any. Atlarix Auto picks the model for each kind of step, or you
choose a Core model, your own API key (Anthropic, OpenAI, DeepSeek, OpenRouter and many more),
or a local model through Ollama or LM Studio.

**Is it free?** Every feature is free. You pay only for Atlarix-hosted models (Pro or credit);
your own key and local models cost nothing on Atlarix's side.

**Does my code leave my machine?** Not to Atlarix: nothing indexes your repository and no file
contents are sent as telemetry. Prompts go only to the model you chose.

**How is the cloud agent different from the CLI?** The cloud agent runs unattended in your
repository's GitHub Actions and comes back as a pull request; the CLI works with you
interactively in your terminal.

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
| [**Atlarix CLI**](docs/HEADLESS.md) | Install routes, `atlarix run` for CI and benchmarks, every flag |
| [**Research & benchmarks**](docs/RESEARCH.md) | The Zenodo paper, and where the real benchmark numbers live |
| [**Contributing**](CONTRIBUTING.md) | Skills, the MCP registry, and what this repo is not |
| [**Security policy**](docs/SECURITY.md) | How to report a vulnerability |
| [**License**](docs/LICENSE.md) | End-user license agreement |
| [**What's-new notes**](docs/UPDATES.md) | Maintainer notes on `updates.json` |
| [**Core cutover**](docs/CORE-CUTOVER.md) | Maintainer runbook for moving a Core tier to a provider's own API |

---

*Atlas + Axis + Intelligence*
