# Intégration Angular ↔ PostGraphile

## Prérequis locaux

1. Stack Postgres + Flyway + PostGraphile : `pokecoach2-conception/deployment/local/docker-compose.yml`
2. PostGraphile exposé sur `http://127.0.0.1:4042/graphql` (rôle `authenticated_user` via `DEFAULT_PG_ROLE`).
3. Angular en dev : `devbox run start` — proxy `/graphql` → `127.0.0.1:4042` (`src/proxy.conf.json`).

### Jeu de données démo (ex-mock localStorage)

Depuis `pokecoach2-conception/` :

```bash
./scripts/seed-demo.sh
```

Le script régénère `tests/fixtures/demo.generated.sql` à partir des fixtures Angular (`demo-teams.ts` + rapport `buildMockMatchupReport`), puis recharge en base :

- **Chompy** (équipe avec matchup + rapport mock complet)
- **Nirinbo** (deuxième équipe sans matchup)
- Adversaire **Nirinbo** + matchup `c3333333-…`

Regénération manuelle uniquement : `npm run generate:demo-seed` dans `pokecoach-angular/`.

## Correctif SQL appliqué (tâche 1)

Migration `V1.0.7__grant_authenticated_invoker_functions.sql` : accorde `EXECUTE` sur `core.current_actor()` et `core.is_valid_pokemon_slot_entry(jsonb)` à `authenticated_user` (requis pour les triggers d’audit à l’insertion d’équipes/matchups).

Tests manuels réussis sur `http://127.0.0.1:4042/graphql` :

- `CreateOwnedTeam`
- `CreateOpponentMatchup` avec création imbriquée de l’adversaire

## Comportement produit

- Données métier : lecture/écriture équipes et matchups via GraphQL uniquement.
- `pokecoach.demo.v1` dans le navigateur n’est plus lu ni modifié.
- Nouveau matchup : message « Matchup enregistré — aucune analyse disponible » tant qu’aucun run n’existe.
- Rapports `source = mock` en base : affichés avec l’étiquette « Rapport de démonstration enregistré ».

## Tests

| Commande | Rôle |
| --- | --- |
| `devbox run test` | Vitest (client GraphQL, mappers, API mock HTTP) |
| `npm run e2e` (dans `pokecoach-angular/`) | Playwright avec mock `/graphql` |
| `POKECOACH_GRAPHQL_URL=http://127.0.0.1:4042/graphql devbox run test` | Contrat d’écriture optionnel (`CoachApi integration`) |
| `POKECOACH_E2E_LIVE_URL=http://127.0.0.1:4200 npm run e2e:live` | Recette réelle (sans interception GraphQL) |

## Docker frontend

Le conteneur Nginx sert l’SPA et proxy `/graphql` vers `http://postgraphile:4000`. Démarrer PostGraphile avec le profil frontend :  
`docker compose --profile frontend up postgraphile angular`.
