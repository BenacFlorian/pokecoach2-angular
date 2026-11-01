# Recette — ouvertures conditionnées (Lead & pick)

Contrat et ordre de phases : backend `pokecoach2-python/docs/plans/2026-11-01-10-ouvertures-conditionnees-au-lead.md` (A→C→B→D).

## Après nettoyage des analyses (Flyway / reset SQL)

1. Vider le stockage local du navigateur pour ce site (sessionStorage), ou au minimum la clé `pokecoach.pendingAnalysis.v1`, pour ne pas renvoyer une commande start/continue obsolète.
2. Recharger l’app ; une URL avec un `runId` supprimé doit afficher le matchup sans analyse, avec possibilité de relancer.
3. Lancer un **nouveau** run (cible `C` ou `B` ou `D` selon le besoin) et vérifier que les checkpoints proviennent du même `runId` après refresh.

## Smoke manuel (stack réelle)

Prérequis : API Python, worker, PostGraphile, Showdown/VGC selon votre recette backend.

| Étape | Attendu UI |
| --- | --- |
| Pause après **C** | Lead & pick : sélection à gauche ; à droite message d’attente des ouvertures (pas de cartes B). |
| Continuer **B** | Cartes par lead adverse (ordre fréquence A) : tour 1 adverse + notre tour 1 recommandé, sans lien causal entre les deux blocs. |
| Opponent Leads | Leads + fréquences A ; **pas** de bloc « Actions conjointes tour 1 » ; backs après B avec mention « face à notre sélection recommandée ». |
| **D** | Affinage inchangé ; les fréquences de choix B ne sont pas remplacées par les taux de victoire D. |

Comparer sélection C, `openings.selection`, fréquences et recommandations au JSON PostGraphile du run (même `resultRevision`).

## Vérifications automatisées locales

```bash
cd pokecoach2-angular
devbox run test
devbox run lint
devbox run build
```

E2E live (optionnel) :

```bash
export POKECOACH_ANALYSIS_LIVE=1
export POKECOACH_CONDITIONED_OPENINGS_RUN_URL='http://127.0.0.1:4200/...'  # URL avec runId ACB+
npm run e2e:conditioned-openings-live
```

## Exemples contractuels (tests unitaires)

Les fixtures JSON sont dans `pokecoach2-python/contracts/examples/openings/` (`empty`, `a`, `ac`, `acb`, `acbd`). Le frontend les lit en test uniquement (pas d’import runtime).
