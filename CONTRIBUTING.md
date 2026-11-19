# Contributing to LoreWriter

Thanks for your interest in contributing! LoreWriter is a local-first, open-source storytelling app — bug reports,
ideas and code are all welcome. Please use the issue templates (bug report / feature request) and keep discussions
in the issues/PRs.

## Getting started

```bash
git clone https://github.com/DarkRewar/LoreWriter.git
cd LoreWriter
npm ci
npm run dev        # http://localhost:5173
```

Checks to run before opening a PR:

```bash
npm run typecheck  # strict TypeScript
npm test           # vitest unit + loopback integration tests
npm run build      # production build (also validates the PWA)
```

Desktop app in dev mode: `npm run desktop:dev` (requires Rust via rustup, see README).

## Git workflow (gitflow)

- **`develop`** is the iteration branch — all feature branches start from up-to-date `develop` and PRs target it.
- **`main`** is the release branch — every push to `main` builds and publishes the desktop apps (release
  `desktop-vX.Y.Z`); `v*` tags trigger the GitHub Pages deploy.
- New work: `git checkout develop && git pull && git checkout -b feature/<topic>` (or `fix/<topic>`), then open a
  PR to `develop` using `.github/PULL_REQUEST_TEMPLATE.md`.
- Before merging: `git fetch origin && git rebase origin/develop`, resolve conflicts, `git push --force-with-lease`,
  wait for green CI, then merge. Delete the feature branch afterwards (local + remote).
- CI runs typecheck + tests + build on `main`, `develop` and PRs — it must be green.

## Code conventions

- **Deletions** must go through the in-app confirmation modal: `const confirm = useConfirm()`
  (`src/components/ConfirmDialog.tsx`) → `if (await confirm({ title, message })) { … }`. Never `window.confirm`.
- **UI strings** are i18n'd: `const { t } = useI18n()` → `t('section.key', { vars })`. Add new keys to
  `src/i18n/fr.ts` (typed reference) **and** `src/i18n/en.ts` (parity is enforced by the `Messages` type and a
  test). User-written content is never translated. Non-React libs use `tStandalone('key')`.
- No new dependency without a written justification in the PR; no `any`; TypeScript strict.
- Commits in French are fine (historical convention); PR titles/descriptions in English or French.
- No secrets in code — the app is 100 % client-side; credentials are runtime user input only.

## Project layout

See the "Project structure" section in [README.md](README.md). Tests live next to the code (`src/**/*.test.ts`),
including a loopback WebDAV integration test for cloud sync.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
