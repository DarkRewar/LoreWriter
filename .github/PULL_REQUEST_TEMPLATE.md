## Résumé

- Change quoi, pourquoi.

## Checklist workflow (gitflow, base `main`)

- [ ] Branche créée depuis `main` à jour : `git checkout main && git pull && git checkout -b feature/<sujet>`
- [ ] Rebase sur `main` avant merge : `git fetch origin && git rebase origin/main` (puis `git push --force-with-lease` si la branche était déjà poussée)
- [ ] CI verte (typecheck + tests + build)
- [ ] `npm run build` OK en local

## Vérification

- Commandes exécutées, résultats.
