## Résumé

- Change quoi, pourquoi.

## Checklist workflow (gitflow, base `develop`)

- [ ] Branche créée depuis `develop` à jour : `git checkout develop && git pull && git checkout -b feature/<sujet>`
- [ ] PR ouverte vers `develop` (les features ne mergent pas directement sur `main`)
- [ ] Rebase sur `develop` avant merge : `git fetch origin && git rebase origin/develop` (puis `git push --force-with-lease` si la branche était déjà poussée)
- [ ] CI verte (typecheck + tests + build)
- [ ] `npm run build` OK en local

## Vérification

- Commandes exécutées, résultats.
