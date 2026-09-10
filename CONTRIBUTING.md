# Contributing

Atlarix itself is closed-source, so there is no app code to send a pull request to. What
you *can* contribute to is the ecosystem around it — and two of the three things below are
contributions to your own repository rather than to ours, which is the point.

## Bug reports and ideas

- **[Issues](https://github.com/AmariahAK/atlarix-releases/issues)** — bug reports. The
  most useful ones name your OS and the Atlarix version from Settings → About.
- **[Discussions](https://github.com/AmariahAK/atlarix-releases/discussions)** — ideas,
  questions, and feedback.

Security vulnerabilities do **not** go in Issues — see the
[security policy](docs/SECURITY.md).

## Skills — write them in your own repo

A skill is a markdown file in your repository, under `.atlarix/skills/`, that teaches
Atlarix a repeatable job: a release checklist, a review rubric, the way your team writes
migrations. Atlarix sees each skill's name and description on every turn and reads the
whole file only when that job comes up, so a workspace can hold as many as it likes
without them costing prompt space.

Write one yourself, or ask Atlarix to write it for you, and commit it alongside your
project docs. They travel with the repo, so everyone working in it gets the same
behaviour.

**There is no central registry to install from, deliberately.** There was one, and the
lesson from it was that the skills which earn their place are the ones specific to a
codebase — not generic ones fetched from a list. So the best place to contribute a skill
is your own project, where it will actually be used.

## MCP registry

Curated Model Context Protocol listings for the Atlarix MCP marketplace live in a separate
repo, and that one does take contributions:

**[github.com/AmariahAK/atlarix-mcps](https://github.com/AmariahAK/atlarix-mcps)**

It holds no server code — just a merged `index.json` of MCP servers, which Atlarix installs
from via each entry's `installUrl`.

## What this repo does not contain

The desktop app repository lives at
**[github.com/AmariahAK/Atlarix](https://github.com/AmariahAK/Atlarix)** (not open source)
and publishes installers here via automation. Nothing in this repo builds the app; it
carries releases, the two live JSON config files, and docs.
