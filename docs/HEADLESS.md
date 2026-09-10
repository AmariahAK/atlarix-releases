# Atlarix headless agent

The Atlarix agent loop as a command-line tool — for benchmarks (Terminal-Bench, SWE-bench),
CI, and unattended tasks. It is the *same* agent the desktop app runs, with Electron
stubbed out; it is not a reduced or reimplemented version.

Most people want [the desktop app](https://atlarix.dev) instead. This is for running the
agent without a screen.

---

## Install

### npm (recommended)

```bash
npm install -g atlarix
atlarix --version
```

Published to npm on every release. Works on **macOS, Linux and Windows**, and puts an
`atlarix` binary on your `PATH`. Requires **Node 20+**.

### Tarball (Linux, no npm)

```bash
mkdir -p /opt/atlarix
curl -fsSL -o atlarix-headless.tar.gz \
  https://github.com/AmariahAK/atlarix-releases/releases/download/headless-bench/atlarix-headless-linux-amd64.tar.gz
tar -xzf atlarix-headless.tar.gz -C /opt/atlarix
node /opt/atlarix/dist-headless/atlarix-headless.mjs --version
```

`linux/amd64`, runtime-only, from the
[headless-bench](https://github.com/AmariahAK/atlarix-releases/releases/tag/headless-bench)
release. `atlarix-headless-linux-amd64.tar.gz` always points at the newest build;
version-stamped copies are kept beside it for reproducing an older run.

Every example below uses the `atlarix` binary. With the tarball, substitute
`node /opt/atlarix/dist-headless/atlarix-headless.mjs`.

---

## Run a task

Point it at a repo and give it a task. **Prefer `--provider-id <vendor>`** — it talks to
the vendor's API directly, which is what Atlarix Core itself does:

```bash
export DEEPSEEK_API_KEY="sk-..."
atlarix \
  --workspace /path/to/repo \
  --prompt-file task.md \
  --provider-id deepseek \
  --model deepseek-v4-pro \
  --api-key "$DEEPSEEK_API_KEY" \
  --deep-thinking
```

`atlarix run …` also works and does the same thing. The subcommand exists so the binary
has room to grow an interactive mode later without this batch behaviour changing shape.

### Why `--provider-id` rather than `--provider-url`

**Reasoning is only placed in the request when the wire provider is known.** With a bare
`--provider-url`, Atlarix cannot tell which vendor it is talking to, so it dispatches
*without* the reasoning parameter — the run silently executes at a different effort level
than you asked for. Use `--provider-id` whenever the vendor is built in, and keep
`--provider-url` for endpoints that have no built-in id:

```bash
atlarix --workspace /path/to/repo --prompt-file task.md \
  --provider-url http://localhost:11434/v1 --model qwen3-coder --api-key ollama
```

Model ids are the **vendor's own** (`deepseek-v4-pro`), not gateway-prefixed
(`deepseek/deepseek-v4-pro`) — the prefixed form is only for OpenRouter.

### Through OpenRouter, pinned

Useful when a comparison needs byte-identical weights and precision across runs. This is
a benchmarking tool, not the recommended path for real work:

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
atlarix \
  --workspace /path/to/repo \
  --prompt-file task.md \
  --provider-id openrouter \
  --model deepseek/deepseek-v4-pro \
  --api-key "$OPENROUTER_API_KEY" \
  --openrouter-provider '{"order":["deepinfra"],"allow_fallbacks":false,"quantizations":["fp8"]}'
```

---

## Flags

| Flag | Env var | Default | Notes |
| --- | --- | --- | --- |
| `--workspace <dir>` | — | cwd | Repo to work on |
| `--prompt <text>` / `--prompt-file <path>` | `ATLARIX_HEADLESS_PROMPT` | — | The task (one is **required**) |
| `--provider-id <id>` | `ATLARIX_HEADLESS_PROVIDER_ID` | `openrouter` | Built-in vendor — **prefer this** |
| `--provider-url <url>` | `ATLARIX_HEADLESS_PROVIDER_URL` | — | Custom OpenAI-compatible base URL (no reasoning — see above) |
| `--model <name>` | `ATLARIX_HEADLESS_MODEL` | `deepseek/deepseek-v4-pro` | Model id |
| `--api-key <key>` | `ATLARIX_HEADLESS_API_KEY` | — | Provider key (plaintext) |
| `--deep-thinking` | `ATLARIX_HEADLESS_DEEP_THINKING` | off | Reasoning at the model's own ceiling — **see below** |
| `--openrouter-provider <json>` | `ATLARIX_OPENROUTER_PROVIDER_JSON` | — | Routing pin (OpenRouter only) |
| `--trajectory-file <path>` | — | — | JSONL trace of the run |
| `--mode build\|ask` | — | `build` | `build` = autonomous coding, `ask` = read-only |
| `--timeout <ms>` | `ATLARIX_HEADLESS_TIMEOUT_MS` | **none** | Wall-clock deadline |
| `--version` / `-v` | — | — | Prints the version and exits 0, with no task |

### `--deep-thinking` matters more than it looks

Atlarix has one reasoning control, derived per model rather than a global ladder: **on**
is that model's own declared ceiling (`max` on budget-capable vendors — DeepSeek, Qwen,
MiniMax, Google; `high` where effort tops out there — OpenAI, OpenRouter), **off** is one
notch below.

Leaving it unset is what made every benchmark run dispatch at the *off* level, while
published leaderboard entries all run the ceiling. That is a confound, not a fair reading
of the model. If you are comparing against a published number, pass it.

### There is no default timeout

Unset means **no self-imposed deadline** — the launcher owns it. There used to be a
10-minute default, and it silently capped every long task (Terminal-Bench 4.0 allows
eight hours) and exited 1, which reads as a *failed trial* rather than a stopped one.
Set `--timeout` only if you want the agent itself to give up.

`Ctrl-C` / `SIGTERM` end a run cleanly.

### Reading the output

Prefer `--trajectory-file <path>` over parsing console output — it streams JSONL, one
event per line, and is a stable interface in a way that log text is not.

**Exit codes:** `0` the turn completed (or the agent emitted `<task_complete>`) ·
`1` timeout or error · `2` bad arguments.

---

## What differs from the desktop app

The headless bundle **auto-approves file and command operations** — it is unattended, so
there is nobody to ask. Run it against a repo you are willing to let it change, ideally in
a container. It also forces native function-calling and drops the browser tools.

It ships a bundled models.dev snapshot beside the binary, so the model catalogue works
inside sandboxes with no egress to models.dev — which matters because without a catalogue
the per-model reasoning profile is unavailable, and that changes the *shape* of the
reasoning parameter sent. Same command, different request, depending on the sandbox's
egress rules.

---

**Benchmarks:** [atlarix.dev/benchmark](https://atlarix.dev/benchmark) is the official home
for Atlarix benchmark results, with raw result files and reproduction steps.
