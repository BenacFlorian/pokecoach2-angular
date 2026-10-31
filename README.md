# pokecoach2-angular

Frontend **pokecoach** (Angular) — parcours accueil → équipe → préparation de matchup avec données fictives.

## Prérequis

- [Devbox](https://www.jetify.com/docs/devbox/installing_devbox/) (testé avec **0.17.3**)

## Environnement

| Outil | Version |
| --- | --- |
| Devbox | 0.17.3 |
| Node.js | 22.23.3 |
| npm | 10.9.9 |
| Angular CLI | 22.2.5 |
| Angular | 22.2.x |

## Commandes (depuis la racine de ce dépôt)

| Commande | Description |
| --- | --- |
| `devbox run setup` | `npm ci` dans `pokecoach-angular/` |
| `devbox run start` | Serveur de dev (`http://localhost:4200`) |
| `devbox run build` | Build de production |
| `devbox run test` | Tests unitaires (Vitest, sans watch) |
| `devbox run lint` | ESLint + accessibilité des templates |
| `devbox run e2e` | Parcours Playwright (démarre `ng serve` si besoin) |

Avant le premier `e2e`, installer les navigateurs Playwright :

```bash
devbox run -- npm --prefix pokecoach-angular exec playwright install chromium
```

## Routes

| Route | Contenu |
| --- | --- |
| `/` | Liste de nos équipes, import URL Poképaste ou texte Showdown |
| `/teams/:teamId` | Bandeau de l’équipe, liste des matchups, préparation d’un adversaire |
| `/teams/:teamId/matchups/:matchupId` | Bandeau adverse, onglets **Opponent Leads**, **Lead & pick**, **Gameplan** |
| `/developer/design-system` | Aperçu charte (build **development** uniquement) |

## Données et services

- **Import** : parsing Showdown local ; URL `pokepast.es` récupérée en HTTP (`/raw`).
- **Images** : PokéAPI (`/api/v2/pokemon/…`) avec cache et placeholder local.
- **Analyses** : entièrement fictives (`CoachStore`, `MockMatchupPreparation`, `console.log [mock] prepare-matchup`).
- **Persistance** : `localStorage` clé `pokecoach.demo.v1` (équipes + matchups). Deux équipes de démo sont injectées si aucune sauvegarde valide.

## Limites volontaires

Pas de backend Python, LLM, LangGraph ni analyse réelle. Les tests e2e interceptent Poképaste et PokéAPI.

## Plans

- [Plan 1 — initialisation](./docs/plans/2026-10-31-01-angular-initialisation.md)
- [Plan 2 — interface mock](./docs/plans/2026-10-31-02-angular-interface-mock.md)
