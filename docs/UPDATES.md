# What's-new notes (`updates.json`)

[`updates.json`](../updates.json) is the short note the desktop app shows in its
bottom-left "what's new" panel. This is a maintainer's file — if you are here to download
Atlarix, you want [the release notes](https://github.com/AmariahAK/atlarix-releases/releases)
or [the changelog](https://www.atlarix.dev/changelog) instead.

It is published here rather than bundled into the app for one reason: **a note bundled into
a release only reaches people who have already updated**, which is backwards for telling
someone an update exists.

## The rules the app applies

Each entry is `{ id, title, body, link, linkLabel }`. The app shows the **first** entry and
remembers the `id` it dismissed, so:

- Editing an entry's text **does not** bring the panel back for someone who dismissed it.
  That is deliberate — a typo fix is not news.
- Adding a new entry with a **new `id`** surfaces the panel again for everyone.
- Reusing an old `id` is the one thing to avoid: it will stay dismissed for exactly the
  people who have seen the least of it.

Keep `body` to a line or two. The moment it wants scrolling it has become the changelog,
and [there already is one](https://www.atlarix.dev/changelog).

## Why there is a CI check for a five-field JSON file

`node scripts/check-updates.mjs` checks the file against the rules above, and CI runs it on
every pull request that touches it.

That check exists because the app's failure mode here is **silence**. On anything it cannot
use it renders nothing, deliberately — the app ships no bundled copy of this file and shows
an empty panel to nobody, because an empty panel is worse than no panel. So a missing field
or an `http://` link looks exactly like "there is no note right now", and would go
unnoticed indefinitely.

The same reasoning covers `core-models.json`, which is checked by the same workflow: both
files are published the moment they land on `main` and every installed client picks them up
within the hour, with no build and no release in between.
