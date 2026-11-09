# Recette équipes / matchups — compte rendu d’implémentation

Date : 9 novembre 2026. **Aucun commit** (attente tests manuels).

## Conception (pokecoach2-conception)

| Contrôle | Résultat |
| --- | --- |
| `./scripts/test-db.sh` sur `pokecoach2_test` | OK (001–120) |
| Migrations appliquées | `1.0.16`–`1.0.18` + `R__team_matchup_search` |
| `devbox run migrate` sur `pokecoach2` | OK |
| Contrat GraphQL documenté | `docs/contrats/2026-11-08-equipes-matchups-graphql.md` |
| Introspection live (`deleteOwnedTeam`, `searchTeamMatchups`) | OK après restart PostGraphile |

Note : `1.0.18` corrige la boucle texte du validateur gameplan introduit en `1.0.15`.

## Python (pokecoach2-python)

| Contrôle | Résultat |
| --- | --- |
| `uv run pytest tests/unit` (hors `test_vgc_subprocess`) | 118 passed |
| Nouveaux tests lifecycle / supervisor / commands | 16 passed |
| `tests/integration/test_team_deletion.py` | 7 skipped (pas de `TEST_DATABASE_URL`), 3 passed |

## Angular (pokecoach-angular)

| Contrôle | Résultat |
| --- | --- |
| `npm test --watch=false` (Node **24.15**) | 84 passed, 1 failed, 1 skipped |
| Échec restant | `simulation-result-validator.spec.ts` — exemple `simulation-complete.json` (hors périmètre équipes ; alignement contrat Phase E) |
| `npm run build` | OK (signalé par l’agent d’implémentation) |
| Playwright `team-lifecycle*.spec.ts` | Non exécuté ici |
| Recette transversale README | **À faire manuellement** avec stack réelle |

## Contrôles manuels recommandés

Voir [README refonte](../../README-refonte-equipes-matchups.md#recette-transversale-finale) : suppression pendant run, recherche au-delà de 50, réponses périmées, deux onglets.
