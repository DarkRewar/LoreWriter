## Summary

- What does this change, and why?

## Workflow checklist (gitflow, base `develop`)

- [ ] Branch created from up-to-date `develop`: `git checkout develop && git pull && git checkout -b feature/<topic>`
- [ ] PR opened against `develop` (features never merge straight into `main`)
- [ ] Rebased on `develop` before merging: `git fetch origin && git rebase origin/develop` (then `git push --force-with-lease` if the branch was already pushed)
- [ ] CI green (typecheck + tests + build)
- [ ] `npm run build` OK locally

## Verification

- Commands run, results.
