# ✒️ LoreWriter

A **storytelling workbench** that runs in your browser: create story projects, flesh out your characters, map their
relationships, write dialogues and your novel, find anything instantly with global search — and sync everything to
**your own cloud** so you can pick up where you left off on any device.

> 🇫🇷 Une version française de ce README est disponible dans [README.fr.md](README.fr.md).

![stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Vite-blue)
![license](https://img.shields.io/badge/license-MIT-green)

## Why LoreWriter?

- **Your data stays yours.** Everything is stored locally in your browser (IndexedDB) and works fully offline. Cloud
  sync is *optional* and goes to **your own WebDAV server** (Nextcloud, ownCloud, a NAS…) — no account, no
  third-party SaaS, no lock-in. Credentials never leave your browser except to your own server.
- **One project, every device.** Office PC, Mac on the couch, phone on the go: the same project everywhere via
  WebDAV sync (automatic on open + every 60 s, manual **🔄 Sync now** button, or **💾 / Ctrl+S**), or via a single
  `.lore` export file.
- **Ready for game engines.** Chapters are real Markdown files, dialogues are structured JSON, and a whole project
  exports as one `.lore` archive (a ZIP of those files) — easy to parse or convert for Godot/Unity or any tooling.
  (A dedicated game-export pack — versioned JSON + CSV + PNG portraits — is planned, see issue #6.)
- **Local-first PWA + native desktop apps.** Install the web app on your phone ("Add to home screen", works
  offline), or use the standalone **Windows / macOS** apps (Tauri v2) published on each release.
- **Bilingual UI (FR/EN)** with a flag picker in the topbar; defaults to your OS language. Your *content* is never
  translated — you write in whatever language your story uses.

## Features

### Projects
Multiple independent story universes. Duplicate, export, import, delete (with an in-app confirmation modal).

### Characters
First name, last name, nickname, birth date (**age computed automatically**) or manual age, role, tags, **custom
metadata** (key/value), portrait (image picker), and notes.

### Relationships
Between characters: parent/child, sibling, spouse, friend, mentor/student, rival, enemy… with a free-form
detail, viewable as a **list** or an **interactive relationship graph** (click a node to open that character's
page).

### Dialogue editor
Scenes made of lines assigned to each character (or the narrator), with a formatted **preview** mode, optionally
linked to a plot — findable from the plot's page.

### Novel editor
**Several novels per project**, chapters with a **rich text editor** (bold, italic, headings, lists, quotes…),
live word count, and a writing area that **stays within the screen** (internal scroll — handy in the desktop app).
Each chapter can be downloaded individually as **Markdown** (`*.md`) and is stored as a dedicated file in
multi-file exports and cloud sync.

### Plots
Title, synopsis, status (idea / draft / in progress / done), tags, and involved characters.

### Wiki (world dictionary)
Per-project entries with a **title** and a **rich description** (same editor as chapters, exportable as `.md`),
filterable list, included in global search, the `.lore` export and cloud sync (`wiki/<id>.md`).

### @mentions
In the rich editors (chapters, wiki, dialogue lines): type `@` + a few letters to open a popup with the **top 3
matching entities** (characters, wiki entries, dialogues, novels, plots); picking one inserts a clickable `@Label`
link that opens that entity's page. Mentions round-trip to Markdown as `[@Label](mention://kind/id)`.

### Global search
Instant search across the whole project (characters, relationships, dialogue lines, novels, chapters, plots,
wiki), case- and accent-insensitive, with snippets — **Ctrl+Space** focuses the search bar.

### Saving & cloud sync
- **💾 button** in the topbar and **Ctrl+S** (Cmd+S on macOS): flushes pending editor writes, then pushes to the
  cloud if WebDAV sync is enabled, otherwise saves locally — with a confirmation toast.
- **Automatic sync**: on project open + every 60 s, plus a **🔄 Sync now** button in the project sidebar (with
  success/error feedback). Each project is stored on your WebDAV server as **multiple files** — a base
  `project.json`, one `chapters/<id>.md` (Markdown) per chapter, one `dialogues/<id>.json` per scene, one
  `wiki/<id>.md` per wiki entry — merged entity-by-entity (latest change wins) on every sync. Deletions are
  propagated via tombstones, so something deleted on one device never reappears on another.
- **Automatic `.lore` backups** (off by default, configurable on the ☁️ Cloud page): after each successful sync
  ("every sync" or "once a day"), a `<project>-YYYYMMDD-HHMM.lore` file is written — to a folder picked with a
  native dialog in the desktop app, or downloaded in the browser/PWA.
- On a **new device**, the home page lists projects present on the cloud but not locally yet
  ("☁️ Projects on the cloud") with a **⬇️ Download** button.

### Export / import: one `.lore` file
A whole project exports/imports as a **single `.lore` file** — a ZIP archive (openable with any tool) containing
the multi-file project backup (`project.json` base, `chapters/*.md`, `dialogues/*.json`, `wiki/*.md`), identical
to the cloud format. In the **desktop app**, export opens a native file dialog (Explorer/Finder) to choose where
to save.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

### Tests and build

```bash
npm test           # unit tests (vitest)
npm run typecheck  # strict TypeScript check
npm run build      # production build in dist/
```

### Typical first session

1. Create a **project** (home page → "New project").
2. Add **characters** (🧍 Characters → "+ New character").
3. Link them in **Relations** (🔗) — list or graph view.
4. Sketch **plots** (🧵) and attach characters/scenes.
5. Write **dialogues** (💬) — scenes of lines, with preview.
6. Write your **novel** (📖) — novels → chapters → rich editor; `@` mentions link to characters/wiki/plots.
7. Fill the **wiki** (📚) with world terms.
8. Use **search** (Ctrl+Space) to find anything.
9. **💾 / Ctrl+S** or **🔄 Sync now** to save and push to your cloud.

## Run it anywhere

### GitHub Pages (automatic)

The app is published automatically at **[https://darkrewar.github.io/LoreWriter/](https://darkrewar.github.io/LoreWriter/)**.

One-time setup in the repo **Settings**:

1. **Settings → Danger Zone → Change visibility → Public** (required for Pages on a free plan; the code contains
   no secrets, it's a 100 % client-side app);
2. **Settings → Pages → Build and deployment → Source → "GitHub Actions"**.

Deployment then runs automatically on every published release (tag `v*`, e.g. `git push origin v0.1.0`) and on
`v*` tag pushes, via `.github/workflows/deploy-pages.yml` (builds the app with base `/LoreWriter/` and runs the
tests). The HTTPS URL lets you install the PWA on a phone ("Add to home screen") and use WebDAV sync without
mixed-content blocking.

### Standalone desktop apps (Windows / macOS)

The app is packaged natively with **Tauri v2** (`src-tauri/`): the web build (`dist/`) is embedded in a native
webview; data stays 100 % local (IndexedDB), WebDAV cloud sync remains optional.

```bash
npm run desktop:dev     # desktop app in dev mode (Vite hot-reload)
npm run desktop:build   # native installer for the current OS
```

**Prerequisite: Rust installed via [rustup](https://rustup.rs)** (≥ 1.85; some transitive Tauri dependencies use
edition 2024). The root `rust-toolchain.toml` pins the exact version — rustup downloads it automatically on the
first `cargo` command. `src-tauri/Cargo.lock` is committed for reproducible builds.

In CI, every **push to `main`** triggers `.github/workflows/release-desktop.yml`, which builds the **Windows x64**
installers (NSIS `.exe` + MSI) and the **universal macOS** package (`.dmg`/`.app`, Intel + Apple Silicon) and
publishes a GitHub release `desktop-vX.Y.Z` with the artifacts. The `desktop-v*` tag does not trigger the Pages
deploy (reserved for `v*` tags).

The desktop app version is read from `package.json` (`version`) and `src-tauri/tauri.conf.json` — bump both on
each release. Icons (`src-tauri/icons/`) are regenerated from a 1024×1024 PNG with `npx tauri icon <file.png>`.

### Self-host (Docker)

The app is a static SPA: serve the contents of `dist/` with any web server.

```bash
npm run build
docker build -t lorewriter .
docker run -p 8080:80 lorewriter
# → http://your-server:8080
```

Then open the URL from any device (and "Add to home screen" to install it as an offline-capable PWA).

## Cloud sync setup (WebDAV) — from scratch

LoreWriter works **offline first** (IndexedDB); cloud sync adds **multi-device** (desktop PC, Mac, phone) via any
**WebDAV** server (Nextcloud, ownCloud, Synology NAS, Koofr, pCloud…).

**Step 1 — get a WebDAV space** (HTTPS required when used from a phone):
- hosted: a Nextcloud instance at a hosting provider (e.g. Infomaniak, Zaclys, Hetzner Storage Share…), or
- self-hosted: `docker run -d -p 8080:80 nextcloud` (local Nextcloud, behind an HTTPS reverse proxy to expose it).

**Step 2 — create an app password** (never your main password):
- Nextcloud: **Settings → Security → Devices & sessions → new device** (e.g. "LoreWriter phone").

**Step 3 — configure in the app** (☁️ Cloud page, per browser/device):
1. WebDAV base URL: `https://cloud.example.com/remote.php/dav/files/YOUR_NAME`
2. Username + the **app password** from step 2
3. Remote folder: `LoreWriter` (created automatically)
4. Tick "Enable automatic sync" then **Test connection**

**Step 4 — install the PWA on each device**: open the app URL → "Add to home screen" (phone) / browser menu
(PC/Mac). On each device, repeat step 3 with the same cloud.

**Then**: on project open, the remote version is downloaded and merged (latest change wins, entity by entity),
then pushed back; sync also runs every 60 s, via **💾 / Ctrl+S**, and via the **🔄 Sync now** button in the
sidebar (with success/error feedback). Tip: chapters are real `.md` files in the cloud — editable from
Nextcloud's file editor too. Rule of thumb to avoid conflicts: don't edit the same entity (chapter, scene…) on
two devices at the same time.

> 🔒 Credentials stay in the browser's local storage and are only sent to your WebDAV server URL.

## Project structure

```
src/
  types.ts               # data model (Project, Character, Relationship, DialogueScene, Novel, Chapter, Plot, WikiEntry)
  db.ts                  # IndexedDB database (Dexie)
  i18n/                  # UI translations: fr.ts (typed reference), en.ts, index.tsx (provider + t())
  lib/
    text.ts              # search normalization (accents), HTML → text, snippets
    age.ts               # age computation from a birth date
    relationships.ts     # relationship types + labels
    snapshot.ts          # export format, merge, remap with new ids (incl. deletion tombstones)
    export.ts            # full project snapshot from the DB
    markdown.ts          # HTML <-> Markdown + one .md file per chapter (frontmatter)
    projectFiles.ts      # multi-file save: project.json + chapters/*.md + dialogues/*.json + wiki/*.md
    archive.ts           # mini ZIP (writer/reader, native CompressionStream, CRC32) — no dependency
    lore.ts              # .lore file = ZIP of the multi-file save (one-file export/import)
    search.ts            # global search engine (pure, tested)
    cloud.ts             # WebDAV client + multi-file sync
    backup.ts            # automatic .lore backups after successful syncs
    queries.ts           # high-level operations (create/delete/duplicate/import…)
  components/            # TagInput, MetadataEditor, PortraitPicker, Cytoscape graph, TipTap editor…
  pages/                 # one page per feature
src-tauri/               # Tauri v2 desktop packaging (Cargo.toml, tauri.conf.json, icons, main.rs)
.github/workflows/       # ci.yml (main + develop + PRs) ; release-desktop.yml (desktop build on push to main) ; deploy-pages.yml
```

## Stack

React 18 + TypeScript + Vite, React Router, Dexie (IndexedDB), TipTap (rich editor), Cytoscape (relationship
graph), vite-plugin-pwa (PWA), Vitest (tests). **No server-side dependency: the data belongs to the user.**

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and feature requests: use the issue templates
([bug](.github/ISSUE_TEMPLATE/bug_report.md) / [feature](.github/ISSUE_TEMPLATE/feature_request.md)).

### Git workflow (gitflow: `develop` = iteration, `main` = releases)

- **`develop`**: iteration branch. Feature branches start from up-to-date `develop` and PRs merge into it.
- **`main`**: **release** branch. Every push/merge to `main` automatically builds the **desktop apps**
  (Windows/macOS) and publishes a `desktop-vX.Y.Z` release. CI (typecheck + tests + build) runs on `main`,
  `develop` and PRs to both.
- **New work**: `git checkout develop && git pull && git checkout -b feature/<topic>` (or `fix/<topic>`), then
  open a PR to `develop` when ready (see `.github/PULL_REQUEST_TEMPLATE.md`).
- **Before merging a feature**: rebase on `develop` — `git fetch origin && git rebase origin/develop`, resolve
  conflicts, `git push --force-with-lease`, wait for green CI, then merge (fast-forward after a rebase = linear
  history). After merging, delete the feature branch (local + remote).
- **Cutting a release**: merge `develop` → `main` (review + green CI); the push to `main` builds and publishes
  the standalone apps. GitHub Pages deploys are triggered by `v*` tags pushed from `main`.

### Code conventions

- **Any destructive action** goes through the in-app confirmation modal: `const confirm = useConfirm()`
  (`src/components/ConfirmDialog.tsx`) then `if (await confirm({ title, message })) { … }`. Never `window.confirm`.
- **i18n (UI only)**: every UI string goes through `const { t } = useI18n()` then `t('section.key', { vars })`.
  Dictionaries live one per file (`src/i18n/fr.ts` = typed reference, `src/i18n/en.ts` must have exactly the same
  keys — enforced by the `Messages` type + a parity test). **User-written content is never translated.** Default
  language = OS language (`navigator.language`), changeable anytime via the flag picker in the topbar
  (localStorage `lorewriter:lang`). In non-React libs, use `tStandalone('key')`. To add a language: new
  `src/i18n/<code>.ts` file + entry in `LOCALES` + SVG flag in `src/components/flags.tsx`.
- No new dependency without a justification; no `any`; UI/UX in the app's own voice, commits in French are fine.

## License

[MIT](LICENSE) — use it, fork it, ship it. Your stories belong to you.
