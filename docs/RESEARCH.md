# Research and benchmarks

## Paper

A technical paper on the research behind Atlarix's context-management design is published
on Zenodo:

**Blueprint: Section-Scoped Structural Graph Retrieval and Post-Turn Compression for
Agentic LLM Coding in Multi-Repository Workspaces**
Amariah Kamau — May 2026
DOI: [10.5281/zenodo.20381860](https://doi.org/10.5281/zenodo.20381860)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20381860.svg)](https://doi.org/10.5281/zenodo.20381860)

If you are evaluating Atlarix for a large or multi-repository codebase, this paper
documents the technical evidence for its multi-repo exploration approach.

**One honest note on what shipped:** the paper describes graph retrieval; the shipping app
uses bundled ripgrep for fast, index-free retrieval instead. Indexing a repository means
building a derived copy of it, which is the opposite of the privacy claim, and grep turned
out to be fast enough that the index was not earning its cost.

## Benchmarks

[**atlarix.dev/benchmark**](https://atlarix.dev/benchmark) is the official home for all
Atlarix benchmark work — every comparison (Terminal-Bench and beyond), with raw result
files, full reproduction steps, and honest framing.

It is deliberately **not** mirrored here. Benchmarks are updated as models and tests are
added, and a copy in this repo would be a snapshot that silently goes stale — check there
for the current numbers.

If you want to reproduce a run yourself, the [headless agent](HEADLESS.md) is the same
agent loop with Electron stubbed out, and its guide covers the two settings that quietly
decide whether a benchmark number means anything.
