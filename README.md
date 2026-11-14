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
  aperçu mis en page.
- **Éditeur de roman** : chapitres avec éditeur de texte riche (gras, italique, titres, listes, citations…),
  compteur de mots.
- **Intrigues** : titre, synopsis, statut, tags et personnages impliqués.
- **Recherche globale** instantanée sur tout le projet (personnages, relations, répliques, chapitres, intrigues),
  insensible à la casse et aux accents, avec extraits.
- **Cloud** : stockage local d'abord (IndexedDB, fonctionne hors ligne, PWA installable), puis **synchronisation
  automatique** vers un serveur **WebDAV** (Nextcloud/ownCloud…) : un fichier JSON par projet, fusionné entité par
  entité (la modification la plus récente gagne).
- **Export / import** de projet en `.json`.

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

## Héberger l'application (accès « de n'importe où »)

L'application est une SPA statique : servez le contenu de `dist/` avec n'importe quel serveur web.

```bash
npm run build
docker build -t lorewriter .
docker run -p 8080:80 lorewriter
# → http://votre-serveur:8080
```

Puis ouvrez l'URL depuis n'importe quel appareil (et « Ajoutez à l'écran d'accueil » pour l'installer comme une app
PWA, utilisable hors ligne).

## Configurer la synchronisation cloud (WebDAV)

1. Dans l'app : page **☁️ Cloud**.
2. Renseignez l'URL WebDAV de votre cloud, par exemple Nextcloud :
   `https://cloud.example.com/remote.php/dav/files/VOTRE_NOM`
3. Identifiant + **mot de passe d'application** (Nextcloud : Paramètres → Sécurité → Appareils et sessions).
4. Dossier distant (ex. `LoreWriter`), puis activez la synchro et testez la connexion.

Chaque projet est envoyé sous `<dossier>/lorewriter/<id-projet>.json`. Sur un autre appareil, configurez le même
cloud : à l'ouverture d'un projet, la version distante est téléchargée, fusionnée avec la locale (modification la
plus récente gagnante), puis renvoyée.

> 🔒 Les identifiants restent dans le stockage local du navigateur et ne sont transmis qu'à votre serveur WebDAV.

## Structure du projet

```
src/
  types.ts               # modèle de données (Project, Character, Relationship, DialogueScene, Chapter, Plot)
  db.ts                  # base IndexedDB (Dexie)
  lib/
    text.ts              # normalisation recherche (accents), HTML → texte, extraits
    age.ts               # calcul d'âge depuis une date de naissance
    relationships.ts     # types de relations + libellés
    snapshot.ts          # format d'export, fusion (merge), recopie avec nouveaux ids
    export.ts            # snapshot complet d'un projet depuis la base
    search.ts            # moteur de recherche global (pur, testé)
    cloud.ts             # client WebDAV + logique de synchro
    queries.ts           # opérations haut niveau (créer/supprimer/dupliquer/importer…)
  components/            # TagInput, MetadataEditor, PortraitPicker, graphe Cytoscape, éditeur TipTap…
  pages/                 # une page par fonctionnalité
```

## Stack

React 18 + TypeScript + Vite, React Router, Dexie (IndexedDB), TipTap (éditeur riche), Cytoscape (diagramme de
relations), vite-plugin-pwa (PWA), Vitest (tests). Aucune dépendance serveur : la donnée appartient à l'utilisateur.
