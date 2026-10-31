# Plan 1 — Initialiser pokecoach avec Angular, Devbox et npm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obtenir une application Angular démarrable dans Devbox, gérée avec npm, affichant une page `Hello World`.

**Architecture:** Devbox est configuré à la racine du workspace. L’application standalone, rendue côté navigateur et dotée du routeur, réside dans `pokecoach-angular/`. Ce premier jalon prépare le socle technique ; les écrans métier et la charte complète arrivent dans le plan 2.

**Tech Stack:** Dernière version stable d’Angular au moment de l’exécution, Angular CLI, TypeScript strict, npm, Node.js compatible fourni par Devbox, CSS.

**Spec:** Demande utilisateur du 31 octobre 2026 retranscrite ci-dessous ; [règles du projet](../../../agent.md) ; [vision générale](../../../synthese_projet_vgc_matchup_coach.md). La demande récente prime sur l’ordre de développement de la synthèse.

**Statut :** plan uniquement. Aucune installation ni génération d’application n’est effectuée par la rédaction de ce document.

## Contraintes globales

- Utiliser Devbox, npm et la dernière version **stable** d’Angular, jamais une préversion par défaut.
- Livrer une page `Hello World` à l’URL `/`.
- Ne développer ni Python, ni backend, ni simulation, ni collecte, ni LLM.
- Ne pas démarrer les écrans métier du plan 2 dans ce jalon.
- Préserver `agent.md`, la synthèse, les plans et `.agents/skills/`.
- Lire les skills [angular-developer](../../../.agents/skills/angular-developer/SKILL.md) et [design-system](../../../.agents/skills/design-system/SKILL.md), ainsi que leurs références utiles.
- Choix proposés par ce plan : sous-dossier `pokecoach-angular/`, rendu client sans SSR, routeur activé, npm fourni avec Node.js, aucune installation globale d’Angular CLI.

## Points de vigilance

| Situation | Comportement attendu | Vérification |
| --- | --- | --- |
| Node.js de la machine incompatible | Utiliser le Node.js de Devbox | Tâche 1 : versions relevées dans `devbox run` |
| CLI globale ancienne | Générer avec le CLI stable résolu pour ce projet | Tâche 2 : comparer CLI et dépendances installées |
| Workspace contenant déjà des documents | Générer uniquement dans le sous-dossier prévu | Tâche 2 : revue des fichiers modifiés |
| Réinstallation depuis les fichiers versionnés | Retrouver les dépendances et compiler | Tâche 3 : `npm ci` puis build |
| Route vide ou page de bienvenue Angular conservée | Afficher uniquement la page Hello World attendue | Tâche 3 : visite dans le navigateur |

## Fichiers concernés

| Chemin | Rôle |
| --- | --- |
| `devbox.json`, `devbox.lock` | Environnement Node.js et commandes à la racine |
| `.gitignore` | Exclusion de `.devbox/`, dépendances, caches et sorties générées |
| `README.md` | Préparation, lancement, commandes et versions réellement retenues |
| `pokecoach-angular/package.json`, `package-lock.json` | Dépendances npm et scripts de l’application |
| `pokecoach-angular/angular.json`, `tsconfig*.json` | Configuration générée par Angular CLI |
| `pokecoach-angular/src/main.ts`, `src/index.html` | Bootstrap et document HTML, titre `pokecoach` |
| `pokecoach-angular/src/app/app.config.ts`, `app.routes.ts` | Providers et route `/` |
| `pokecoach-angular/src/app/app.ts`, `app.html`, `app.css` | Racine de l’application et outlet du routeur |
| `pokecoach-angular/src/app/features/home/home.ts`, `home.html`, `home.css` | Page Hello World, remplacée par l’accueil métier au plan 2 |
| `pokecoach-angular/src/styles.css` | Styles globaux minimaux |

Les noms suivent les conventions Angular modernes sans suffixe `.component`. Conserver les autres fichiers générés utiles et adapter les chemins seulement si la version stable du CLI change sa structure, en mettant ce plan à jour.

## Tâche 1 — Préparer un environnement Devbox reproductible

**Fichiers :** créer `devbox.json`, `devbox.lock`, `.gitignore` et la section environnement de `README.md`.

**Interface produite :** depuis la racine, `devbox run node --version` et `devbox run npm --version` fonctionnent avec l’environnement déclaré.

- [ ] Vérifier l’état du workspace et la disponibilité de Devbox avec `devbox version`. Si Devbox manque, suivre la procédure officielle adaptée à la machine et respecter les autorisations requises pour une installation système.
- [ ] Vérifier la version stable d’Angular et sa matrice de compatibilité Node.js au moment de l’exécution. Le plan ne fige pas une version qui pourrait être dépassée lorsqu’il sera exécuté. Voir la [matrice officielle Angular](https://angular.dev/reference/versions).
- [ ] Exécuter `devbox init`, puis `devbox search nodejs`. Choisir une version LTS compatible disponible et l’ajouter via `devbox add nodejs@<version-résolue>` ; remplacer le paramètre par la version réellement vérifiée.
- [ ] Vérifier que le package fournit bien npm. Avec npm disponible dans Devbox, relever `npm view @angular/core dist-tags.latest`, `npm view @angular/cli dist-tags.latest` et les contraintes `engines` correspondantes ; ajuster Node.js avant la génération si nécessaire.
- [ ] Conserver `devbox.json` et `devbox.lock` dans les fichiers à versionner. Exclure `.devbox/`, `node_modules/`, `.angular/`, `dist/`, `coverage/` et les sorties de tests ; ne pas exclure les lockfiles.
- [ ] Documenter les versions effectives de Devbox, Node.js et npm, et vérifier qu’un nouveau `devbox shell` retrouve ces versions.

**Résultat attendu :** Node.js et npm fonctionnent dans Devbox ; aucune dépendance applicative n’est installée globalement. Devbox décrit et verrouille l’environnement selon son [guide officiel](https://www.jetify.com/docs/devbox/quickstart).

## Tâche 2 — Générer Angular et ajouter la page Hello World

**Fichiers :** créer `pokecoach-angular/` avec les fichiers CLI listés ci-dessus, puis la page `features/home/`.

**Interfaces :** `Home` est un composant standalone ; `app.routes.ts` associe `/` à `Home` et redirige provisoirement les routes inconnues vers `/`.

- [ ] Dans Devbox, résoudre le CLI stable et vérifier `npx --yes @angular/cli@latest new --help`. La demande « dernière version » prime sur une éventuelle CLI globale plus ancienne.
- [ ] Générer l’application depuis la racine avec les options suivantes, après vérification de leur présence dans ce CLI :

  ```bash
  devbox run npx --yes @angular/cli@latest new pokecoach-angular --directory=pokecoach-angular --package-manager=npm --routing --style=css --standalone --strict --ssr=false --skip-git --defaults
  ```

  Utiliser `--skip-git` pour éviter un dépôt imbriqué. Ne pas ajouter `--force`. Si le répertoire existe déjà, inspecter son contenu avant de poursuivre. Les options viennent de la [référence Angular CLI](https://angular.dev/cli/new).
- [ ] Relever les versions réellement installées avec `npm exec -- ng version` depuis `pokecoach-angular/`. Conserver `package-lock.json` ; aligner le CLI local et Angular, sans modifier manuellement TypeScript hors des contraintes Angular.
- [ ] Générer `features/home/home` avec le CLI local ; utiliser un template séparé. Remplacer le contenu de bienvenue généré par un `router-outlet` et déclarer la route `/`.
- [ ] Afficher un unique titre sémantique `Hello World` dans `home.html`. Définir le titre du document à `pokecoach` et la langue du document à `fr`. Aucun appel réseau métier.
- [ ] Retirer ou adapter les assertions de démonstration générées par le CLI qui ne correspondent plus au contenu. Ne pas ajouter une suite de tests spécifique pour ce simple texte statique.
- [ ] Vérifier les changements : aucun fichier de consignes ou de skill préexistant n’a été écrasé.

**Résultat attendu :** le routeur rend `Hello World` à `/`, sans page de bienvenue Angular ni fonctionnalité métier.

## Tâche 3 — Fournir les commandes et vérifier le jalon

**Fichiers :** modifier `devbox.json`, `README.md` et `pokecoach-angular/package.json` si nécessaire.

**Interfaces produites à la racine :**

| Commande | Script Devbox |
| --- | --- |
| `devbox run setup` | `npm --prefix pokecoach-angular ci` |
| `devbox run start` | `npm --prefix pokecoach-angular run start` |
| `devbox run build` | `npm --prefix pokecoach-angular run build` |
| `devbox run test` | `npm --prefix pokecoach-angular run test -- --watch=false` |

- [ ] Ajouter ces scripts Devbox en conservant les scripts npm générés (`start`, `build`, `test`). `setup` est explicite ; ne pas réinstaller les dépendances à chaque ouverture de shell.
- [ ] Exécuter `devbox run setup`, puis `devbox run build`. Attendu : installation conforme au lockfile puis compilation réussie sans erreur.
- [ ] Exécuter `devbox run test` si des tests générés sont conservés. Attendu : aucune assertion obsolète ; rapporter exactement ce qui a été exécuté.
- [ ] Exécuter `devbox run start` et ouvrir l’adresse affichée. Vérifier `/`, le rechargement, l’absence d’erreur console et le rendu sur un écran étroit. Aucun test automatisé supplémentaire n’est nécessaire pour le Hello World.
- [ ] Compléter `README.md` avec les prérequis Devbox, les quatre commandes, les versions effectives, l’emplacement de l’application et le lien vers le plan 2.

**Critères de fin :** une personne peut retrouver l’environnement, installer via `npm ci`, démarrer l’application et voir `Hello World`. Le build réussit. Les écrans, services Poképaste/PokéAPI, données fictives et styles métier restent à réaliser dans le [plan 2](./2026-10-31-02-angular-interface-mock.md).
