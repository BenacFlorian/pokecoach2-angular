# pokecoach2-angular

Frontend **pokecoach** (Angular) — parcours accueil → équipe → matchup, données servies par PostGraphile.

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
| `devbox run e2e` | Parcours Playwright avec mock GraphQL |
| `devbox run -- npm --prefix pokecoach-angular run e2e:live` | Recette live (URL explicite, voir doc intégration) |

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
- **API métier** : GraphQL PostGraphile (`/graphql`, proxy dev vers `127.0.0.1:4042`). Équipes et matchups persistés en PostgreSQL.
- **Analyses** : workflow **A→C→B→D** (ouvertures en B, après sélection C). Lues depuis `core.matchup_runs` (checkpoints partiels + `resultRevision`). Recette manuelle : [docs/recette-ouvertures-conditionnees.md](./docs/recette-ouvertures-conditionnees.md).
- **Tests** : `e2e/matchup-create-analysis.spec.ts` mock GraphQL + FastAPI ; `e2e:conditioned-openings-live` avec `POKECOACH_CONDITIONED_OPENINGS_RUN_URL` ; `e2e:matchup-analysis-live` exige `POKECOACH_ANALYSIS_LIVE=1` et une stack Python réelle.
- **Ancien localStorage** (`pokecoach.demo.v1`) : ignoré par l’application ; non supprimé.

Voir [Intégration PostGraphile](./docs/integration-postgraphile.md).

## Limites volontaires

Pas de moteur Python / LLM dans le navigateur. Les tests e2e mockent GraphQL (suite `coach.spec.ts`) ; la suite `e2e:live` cible une stack réelle.

## Plans

- [Plan 1 — initialisation](./docs/plans/2026-10-31-01-angular-initialisation.md)
- [Plan 2 — interface mock](./docs/plans/2026-10-31-02-angular-interface-mock.md)
- [Plan 3 — PostGraphile](./docs/plans/2026-10-31-03-angular-postgraphile.md)
- [Plan 4 — lancer Python à l’ajout d’un matchup](./docs/plans/2026-10-31-04-angular-ajout-matchup-python.md)
- [Plan 5 — ouvertures conditionnées dans Lead & pick](./docs/plans/2026-11-01-05-ouvertures-conditionnees-lead-pick.md) — après le plan backend associé : A → C → B → D, suppression des actions T1 d’Opponent Leads et présentation des deux côtés face à notre sélection fixe. E reste hors périmètre, dans son plan dédié.
- [Spec 6 — page matchup sans onglets](./docs/plans/2026-11-01-06-matchup-page-refonte.md) et [plan d’implémentation 06b](./docs/plans/2026-11-01-06b-matchup-page-refonte-implementation.md) — trois bandes, deux colonnes, accordéon des leads et modales C/D ; contrat backend inchangé.
