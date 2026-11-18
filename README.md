# ✒️ LoreWriter

Atelier de **storytelling** dans le navigateur : créez des projets d'histoire, décrivez vos personnages, tracez
leurs relations, écrivez des dialogues et votre roman, retrouvez n'importe quoi grâce à la recherche globale — et
synchronisez le tout vers **votre propre cloud** pour y accéder de n'importe où.

![stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Vite-blue)

## Fonctionnalités

- **Projets** : plusieurs univers indépendants, dupliquer / exporter / importer / supprimer.
- **Personnages** : prénom, nom, surnom, date de naissance (âge calculé automatiquement) ou âge manuel, rôle, tags,
  **métadonnées libres** (clé/valeur), portrait, notes.
- **Relations** entre personnages : parent/enfant, fratrie, conjoint·e, ami·e, mentor/élève, rival, ennemi…
  avec précision libre, visualisables en **liste** ou en **diagramme relationnel interactif** (cliquez sur un nœud
  pour ouvrir la fiche du personnage).
- **Éditeur de dialogues** : scènes composées de répliques attribuées à chaque personnage (ou au narrateur), avec
  aperçu mis en page, et **reliées à une intrigue** (optionnel) — retrouvables depuis la fiche de l'intrigue.
- **Éditeur de roman** : **plusieurs romans par projet**, chapitres avec éditeur de texte riche (gras, italique,
  titres, listes, citations…), compteur de mots, et une zone d'écriture qui reste **contenue dans l'écran** (scroll
  interne, utile dans l'app desktop). Chaque chapitre peut être téléchargé individuellement en **Markdown**
  (`*.md`) et est sauvegardé comme un **fichier dédié** dans les exports multi-fichiers et la synchro cloud.
- **Intrigues** : titre, synopsis, statut, tags et personnages impliqués.
- **Mentions « @ »** dans les éditeurs riches (chapitres, wiki, répliques de dialogues) : taper `@` + lettres
  ouvre une popup avec les 3 meilleures entités (personnages, wiki, dialogues, romans, intrigues) ; le choix insère
  un lien cliquable `@Label` qui ouvre la page de l'entité. Les mentions sont exportées en Markdown
  (`[@Label](mention://kind/id)`).
- **Wiki (dictionnaire de l'univers)** : entrées par projet avec un **intitulé** et une **description en éditeur
  riche** (comme les chapitres, exportable en `.md`), liste filtrable, recherche globale dédiée, persistance dans
  le `.lore` et la synchro cloud (`wiki/<id>.md`).
- **Recherche globale** instantanée sur tout le projet (personnages, relations, répliques, romans, chapitres,
  intrigues), insensible à la casse et aux accents, avec extraits — **Ctrl+Espace** pour focus la barre de
  recherche.
- **Enregistrement manuel** : bouton 💾 (disquette) dans la barre du haut et **Ctrl+S** (Cmd+S sur macOS) — vide
  les tampons d'écriture et pousse vers le cloud si la synchro WebDAV est activée, sinon enregistre localement.
- **Cloud** : stockage local d'abord (IndexedDB, fonctionne hors ligne, PWA installable), puis **synchronisation
  automatique** vers un serveur **WebDAV** (Nextcloud/ownCloud…) : la sauvegarde de chaque projet se fait sur
  **plusieurs fichiers** — un fichier de base `project.json`, un fichier `chapters/<id>.md` (Markdown) par chapitre
  et un fichier `dialogues/<id>.json` par scène de dialogue — fusionnés entité par entité (la modification la plus
  récente gagne).
- **Export / import** de projet en **un seul fichier `.lore`** (seul format proposé dans l'app) : une archive ZIP
  (ouvrable avec n'importe quel outil) qui contient la sauvegarde découpée en plusieurs fichiers — `project.json`
  (base), `chapters/<id>.md` et `dialogues/<id>.json`, identique au format cloud. Dans l'**app desktop**, l'export
  ouvre une fenêtre native (Explorateur/Finder) pour choisir l'emplacement du fichier.

## Démarrage en développement

```bash
npm install
npm run dev        # http://localhost:5173
```

## Tests et build

```bash
npm test           # tests unitaires (vitest)
npm run typecheck  # vérification TypeScript stricte
npm run build      # build de production dans dist/
```

## Déploiement automatique sur GitHub Pages (GitHub.io)

L'application est publiée automatiquement sur **[https://darkrewar.github.io/LoreWriter/](https://darkrewar.github.io/LoreWriter/)**.

**Configuration initiale (2 clics, une seule fois) dans les réglages du dépôt `LoreWriter` :**

1. **Settings → Danger Zone → Change visibility → Public** (obligatoire pour Pages sur un plan gratuit ; le code
   ne contient aucun secret, c'est une app 100 % client-side) ;
2. **Settings → Pages → Build and deployment → Source → « GitHub Actions »**.

**Déploiement automatique ensuite**, à chaque :

- **release publiée** (tag `v*`, ex. `v0.1.0` créé via l'UI « Releases » ou `git push origin v0.1.0`) — le workflow
  `.github/workflows/deploy-pages.yml` build l'app (base `/LoreWriter/`, tests exécutés) et la déploie sur Pages ;
- push d'un tag `v*` ;
- lancement manuel via **Actions → « Deploy to GitHub Pages » → Run workflow**.

Après la configuration initiale, si le premier run a eu lieu avant l'activation de Pages, relancez-le
(**Actions → Re-run jobs**) ou poussez un nouveau tag.

L'URL en HTTPS permet d'installer la PWA sur téléphone (« Ajouter à l'écran d'accueil ») et d'utiliser la synchro
cloud WebDAV sans blocage de contenu mixte.

## Applications standalone (Windows / macOS)

L'application est packagée en natif avec **Tauri v2** (`src-tauri/`) : le build web (`dist/`) est embarqué dans une
webview native ; les données restent 100 % locales (IndexedDB), la synchro cloud WebDAV restant optionnelle.

```bash
npm run desktop:dev     # app desktop en mode dev (hot-reload Vite)
npm run desktop:build   # installeur natif pour l'OS courant
```

**Prérequis : Rust installé via [rustup](https://rustup.rs)** (≥ 1.85, certaines dépendances transitives de Tauri
utilisent l'édition 2024). Le fichier `rust-toolchain.toml` à la racine du dépôt épingle la version exacte : rustup
la télécharge automatiquement à la première commande `cargo`, aucune action manuelle requise (`rustup update` si
besoin). `src-tauri/Cargo.lock` est commité pour des builds reproductibles.

En CI, à chaque **push sur `main`**, le workflow `.github/workflows/release-desktop.yml` build les installeurs
**Windows x64** (NSIS `.exe` + MSI) et **macOS universel** (`.dmg`/`.app`, Intel + Apple Silicon) et publie une
release GitHub `desktop-vX.Y.Z` contenant les artefacts. Le préfixe `desktop-v*` ne déclenche pas le déploiement
Pages (réservé aux tags `v*`). Le workflow peut aussi être lancé à la main (Actions → Run workflow).

La version de l'app desktop se lit dans `package.json` (`version`) et `src-tauri/tauri.conf.json` : à bump
ensemble à chaque release. Les icônes (`src-tauri/icons/`) se régénèrent depuis un PNG 1024×1024 avec
`npx tauri icon <fichier.png>`.

## Héberger l'application soi-même (Docker)

L'application est une SPA statique : servez le contenu de `dist/` avec n'importe quel serveur web.

```bash
npm run build
docker build -t lorewriter .
docker run -p 8080:80 lorewriter
# → http://votre-serveur:8080
```

Puis ouvrez l'URL depuis n'importe quel appareil (et « Ajoutez à l'écran d'accueil » pour l'installer comme une app
PWA, utilisable hors ligne).

## Configurer la synchronisation cloud (WebDAV) — mise en place from scratch

LoreWriter fonctionne d'abord **hors ligne** (IndexedDB) ; la synchro cloud ajoute le **multi-appareils** (PC fixe,
Mac, téléphone) via n'importe quel serveur **WebDAV** (Nextcloud, ownCloud, NAS Synology, Koofr, pCloud…).

**Étape 1 — choisir/obtenir un espace WebDAV** (HTTPS obligatoire, lu depuis un téléphone) :
- hébergé : une instance Nextcloud chez un hébergeur (ex. Infomaniak, Zaclys, Hetzner Storage Share…), ou
- auto-hébergé : `docker run -d -p 8080:80 nextcloud` (Nextcloud en local, derrière un reverse-proxy HTTPS en ligne).

**Étape 2 — créer un mot de passe d'application** (jamais le mot de passe principal) :
- Nextcloud : **Paramètres → Sécurité → Appareils et sessions → nouvel appareil** (ex. « LoreWriter téléphone »).

**Étape 3 — configurer dans l'app** (page **☁️ Cloud**, par navigateur/appareil) :
1. URL de base WebDAV : `https://cloud.example.com/remote.php/dav/files/VOTRE_NOM`
2. Identifiant + **mot de passe d'application** créé à l'étape 2
3. Dossier distant : `LoreWriter` (créé automatiquement)
4. Cochez « Activer la synchronisation automatique » puis **Tester la connexion**

**Étape 4 — installer la PWA sur chaque appareil** : ouvrez l'URL de l'app → « Ajouter à l'écran d'accueil »
(téléphone) / menu navigateur (PC/Mac). Sur chaque appareil, refaites l'étape 3 avec le même cloud.

**Ensuite** : à l'ouverture d'un projet, la version distante est téléchargée et fusionnée (modification la plus
récente gagnante, entité par entité), puis renvoyée ; la synchro tourne aussi toutes les 60 s et via le bouton
💾 / **Ctrl+S**. Astuce : les chapitres sont de vrais fichiers `.md` dans le cloud — éditables aussi depuis
l'éditeur de fichiers de Nextcloud. Règle pour éviter les conflits : ne pas modifier la même entité (chapitre,
scène…) en même temps sur deux appareils.

Sur un **nouvel appareil**, la page d'accueil liste les projets présents sur le cloud mais pas encore en local
(section « ☁️ Projets sur le cloud ») avec un bouton **⬇️ Télécharger** pour les récupérer.

> 🔒 Les identifiants restent dans le stockage local du navigateur et ne sont transmis qu'à votre serveur WebDAV.

Chaque projet est envoyé sous `<dossier>/lorewriter/<id-projet>/` en plusieurs fichiers : `project.json` (fichier
de base), `chapters/<id>.md` (un Markdown par chapitre), `dialogues/<id>.json` (un JSON par scène) et
`wiki/<id>.md` (une entrée wiki). Un ancien fichier unique `<id-projet>.json` (v1) est automatiquement migré
vers ce format multi-fichiers.

Les **suppressions sont propagées** grâce à des tombstones : chaque suppression écrit une trace dans la table
`deletions` (exportée dans le champ `deleted` de `project.json`), la fusion l'unionne et filtre les entités
supprimées, et au push les fichiers des entités supprimées sont effacés du serveur. Une entité supprimée sur un
appareil ne réapparaît donc pas sur les autres.

## Conventions

- **Toute action de suppression** passe par la modale de confirmation in-app : `const confirm = useConfirm()`
  (`src/components/ConfirmDialog.tsx`) puis `if (await confirm({ title, message })) { … }`. Ne jamais utiliser
  `window.confirm`.

## Structure du projet

```
src/
  types.ts               # modèle de données (Project, Character, Relationship, DialogueScene, Novel, Chapter, Plot, WikiEntry)
  db.ts                  # base IndexedDB (Dexie)
  lib/
    text.ts              # normalisation recherche (accents), HTML → texte, extraits
    age.ts               # calcul d'âge depuis une date de naissance
    relationships.ts     # types de relations + libellés
    snapshot.ts          # format d'export, fusion (merge), recopie avec nouveaux ids
    export.ts            # snapshot complet d'un projet depuis la base
    markdown.ts          # conversion HTML <-> Markdown + fichier .md par chapitre (frontmatter)
    projectFiles.ts      # sauvegarde multi-fichiers : project.json + chapters/*.md + dialogues/*.json + wiki/*.md
    archive.ts           # mini ZIP (writer/reader, CompressionStream natif, CRC32) — aucune dépendance
    lore.ts              # fichier .lore = ZIP de la sauvegarde multi-fichiers (export/import en un seul fichier)
    search.ts            # moteur de recherche global (pur, testé)
    cloud.ts             # client WebDAV + synchro multi-fichiers
    queries.ts           # opérations haut niveau (créer/supprimer/dupliquer/importer…)
  components/            # TagInput, MetadataEditor, PortraitPicker, graphe Cytoscape, éditeur TipTap…
  pages/                 # une page par fonctionnalité
src-tauri/               # packaging desktop Tauri v2 (Cargo.toml, tauri.conf.json, icônes, main.rs)
.github/workflows/       # ci.yml (main + develop + PR) ; release-desktop.yml (build desktop sur push main) ; deploy-pages.yml
```

## Stack

React 18 + TypeScript + Vite, React Router, Dexie (IndexedDB), TipTap (éditeur riche), Cytoscape (diagramme de
relations), vite-plugin-pwa (PWA), Vitest (tests). Aucune dépendance serveur : la donnée appartient à l'utilisateur.

## Workflow Git (gitflow : `develop` = itération, `main` = releases)

- **`develop`** : branche d'itération. Toutes les branches de fonctionnalité partent de `develop` à jour et les PR
  y sont mergées (protéger `develop` comme `main` : Settings → Branches → PR obligatoire + checks CI requis).
- **`main`** : branche des **releases**. Chaque push/merge sur `main` déclenche automatiquement la **build des
  applications desktop** Windows/macOS (workflow `.github/workflows/release-desktop.yml`, release `desktop-vX.Y.Z`).
  La CI (typecheck + tests + build) tourne sur `main`, `develop` et les PR vers ces deux branches.
- **Nouveau travail** : `git checkout develop && git pull && git checkout -b feature/<sujet>` (ou `fix/<sujet>`),
  puis PR vers `develop` quand prêt (voir `.github/PULL_REQUEST_TEMPLATE.md`).
- **Avant de merger une feature** : rebase sur `develop` — `git fetch origin && git rebase origin/develop`, résoudre
  les conflits, `git push --force-with-lease`, attendre la CI verte, puis merger (fast-forward après rebase =
  historique linéaire ; squash possible si préféré). Après le merge, supprimer la branche de fonctionnalité
  (localement et sur le distant).
- **Release d'une version** : PR `develop` → `main` (review + CI verte) ; le push sur `main` build et publie les
  applications standalone. Le déploiement GitHub Pages reste déclenché par les tags `v*` poussés depuis `main`
  (voir section « Déploiement automatique sur GitHub Pages »).
- **Branches** : `develop` (itération) + `main` (releases) + branches temporaires `feature/**`, `fix/**`, `vibe/**`.
