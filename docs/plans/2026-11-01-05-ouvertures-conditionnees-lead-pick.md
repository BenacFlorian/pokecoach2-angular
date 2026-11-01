# Plan 5 — Frontend : ouvertures des deux côtés dans Lead & pick

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer « Actions conjointes tour 1 » de « Opponent Leads » et adapter la partie droite de « Lead & pick » pour montrer, face à chaque lead adverse, ses actions possibles et notre tour 1 recommandé pour notre sélection fixe.

**Architecture:** Consommer les checkpoints de simulation du backend A→C→B→D. Les composants affichent les sections validées du run sélectionné et ses snapshots. Le frontend ne combine pas d’anciennes statistiques ni ne recalcule la recommandation.

**Limite du périmètre :** la phase E viendra conclure le processus via son plan dédié, encore à implémenter. Ce plan ne prévoit aucune implémentation, adaptation ni recette de E ou de l’onglet Gameplan.

**Tech Stack:** Angular 22 existant, TypeScript, signals, HttpClient/PostGraphile, Vitest et Playwright ; design-system existant.

**Spec:** Demande utilisateur du 1er novembre 2026 ; [plan backend et contrat partagé](../../../pokecoach2-python/docs/plans/2026-11-01-10-ouvertures-conditionnees-au-lead.md). Ce plan vient **après le backend** ; ses exemples contractuels permettent de développer les vues avant la recette réelle.

## Périmètre et présentation attendue

### Opponent Leads

- Conserver les leads, leur classement et leurs fréquences A.
- **Supprimer le bloc « Actions conjointes tour 1 »**, son rendu, son état de chargement propre et ses méthodes devenues inutiles. Ne pas le déplacer sous un autre nom dans ce même onglet.
- Conserver le back par paire et les présences individuelles. Ils viennent de `openings.byOpponentLead` après B et sont présentés comme observés **face à notre sélection recommandée**. Après A ou AC, afficher que ces données ne sont pas encore calculées.
- Déplacer les observations de fin de tour B vers la confrontation correspondante dans « Lead & pick », afin de ne pas conserver une analyse d’actions isolée de notre lead.

### Lead & pick

Conserver la colonne gauche : justification de la sélection, nos quatre et indication des deux Pokémon du lead. La colonne droite garde une carte par lead adverse, dans l’ordre des fréquences A, pour **tous les leads étudiés en B**, même hors top C.

```text
Notre sélection recommandée : quatre Pokémon, dont lead A + B

Face au lead adverse X + Y — fréquence au preview
  Tour 1 adverse possible
    Choix principal : les deux actions, leurs cibles, n/N et %
    Autres choix observés : mêmes informations

  Notre tour 1 recommandé
    Les deux actions du modèle, leurs cibles, n/N et %
    « Choix le plus fréquent du modèle pour cette confrontation »
    Autres choix de notre modèle : mêmes informations

  Observations de fin du tour (détail repliable, si disponibles)
```

Les deux blocs sont des distributions séparées : aucun lien visuel « si l’adversaire joue ceci, répondre cela ». Les décisions sont simultanées. Les pourcentages sont des fréquences de choix, **pas des taux de victoire** ; ceux-ci restent dans « Compositions comparées » pour C et dans l’affinage D.

Sur mobile, les cartes passent sous notre sélection ; pas de nouvelle page ni de refonte de navigation. Garder D dans son bloc d’affinage actuel avec son contexte de back fixe ; il ne remplace pas les ouvertures B.

## Contrat unique après nettoyage

Le [plan backend](../../../pokecoach2-python/docs/plans/2026-11-01-10-ouvertures-conditionnees-au-lead.md) fait autorité : sections A `opponentLeads`, C `leadPick`, B `openings`, D `refinement`. `openings.selection` doit égaler `leadPick.selection` du même run. Les champs réservés `gameplan` et `winCondition` restent `null` dans ces checkpoints. Aucun nouveau numéro de version de résultat ni mécanisme de négociation n’est ajouté.

Les anciennes analyses sont supprimées par le nettoyage prévu au plan backend. Le frontend utilise uniquement le contrat remplacé : aucun lecteur historique, aucune conversion et aucun écran de compatibilité à maintenir. Supprimer les chemins devenus inutiles qui reconstruisaient les ouvertures à partir de `turn1.jointActions` ou `leadPick.firstTurns`. Les champs techniques de version éventuellement conservés dans le stockage ne servent pas à sélectionner un ancien rendu.

Appliquer les skills [angular-developer](../../../.agents/skills/angular-developer/SKILL.md) et [design-system](../../../.agents/skills/design-system/SKILL.md), notamment feedback, boutons et accessibilité. Utiliser les chaînes i18n existantes/ajoutées et conserver l’apparence validée.

## Points de revue

| Risque | Vérification propriétaire |
| --- | --- |
| Résultat ou commande obsolète encore en cache après nettoyage | Tâches 1 et 4 |
| Acteur adverse rendu avec notre équipe ; cible alliée rendue comme adversaire | Tâche 3 |
| Run AC masqué parce que B n’est pas encore terminé | Tâches 1 et 3 |
| Frontend resté en ordre A/B/C et mauvaise cible de continuation | Tâche 4 |
| Rafraîchissement mélangeant sélection C et ouvertures B de deux runs | Tâches 1 et 5 |

## Tâche 1 — Remplacer les types, la validation et le modèle de présentation

**Fichiers**, relatifs à `pokecoach2-angular/pokecoach-angular/src/app/` : modifier `core/models/simulation-result.model.ts`, `core/graphql/simulation-result-validator.ts` et son test ; remplacer/renommer `core/matchup/simulation-v2-display.ts` en `simulation-display.ts` et adapter son test/imports. Modifier `core/graphql/coach-dto.ts`, `coach-mappers.ts`, `coach-operations.ts` et leurs tests. Retirer les lecteurs de résultats devenus inutiles, sans créer une deuxième famille de fichiers par version.

**Interfaces :** `validateSimulationResult(raw)` ; `mapSimulationToTabDisplay(result, snapshots)` ; `OpeningStudyDisplay` comporte lead adverse, effectif, fréquences adverses, recommandation et alternatives de notre côté, observations et contexte de sélection. Les valeurs des actions restent structurées, pas converties prématurément en chaînes.

- [ ] Consommer les exemples Python `contracts/examples/openings/` (empty/A/AC/ACB/ACBD) sans import runtime des fixtures. Valider préfixe A/C/B/D, actions, références côté/slot, nombres, dénominateurs, contexte B=C et présence de tous les leads A après B.
- [ ] Remplacer le mapping et la validation actuels par le contrat unique. Des données incohérentes produisent un message de format invalide, jamais une reconstruction depuis des valeurs par défaut. Mettre à jour les fixtures de test et de démonstration, sans conserver de branche pour les anciens résultats.
- [ ] Mapper A vers les leads, C vers la sélection/comparaisons, B vers les nouvelles cartes et les backs du premier onglet. Ne pas passer par `mapSimulationV2ToTabDisplay` ou `LeadRecommendation.studiedLeads` si cela perd les fréquences adverses et le contexte.
- [ ] Afficher `recommendation` telle que publiée par Python ; vérifier qu’elle correspond à une entrée de `ourActions`, mais ne pas la remplacer par un choix recalculé côté navigateur. Les autres entrées constituent les alternatives ; ne pas dupliquer la recommandation dans cette liste.
- [ ] Tester données incohérentes B/C, côté d’acteur erroné, fréquence invalide et lead inconnu. Aucune conversion à base de cast `unknown as` sans validation des actions.

## Tâche 2 — Simplifier Opponent Leads

**Fichiers :** modifier `src/app/features/matchup/opponent-leads.ts`, `opponent-leads.html`, éventuellement son CSS ; créer/compléter `opponent-leads.spec.ts`. Adapter les inputs dans `matchup.ts/html`.

- [ ] Supprimer la section HTML « Actions conjointes tour 1 », ses listes et `sortedJointActions`/formatage propres si inutilisés. Retirer les anciennes observations T1 de cet onglet. Ne pas toucher au classement des leads A.
- [ ] Remplacer le booléen global `turn1Pending` par un état de disponibilité des backs adapté au checkpoint du run. Ne pas laisser la suppression du bloc d’actions masquer les backs disponibles.
- [ ] Associer les backs au lead sélectionné par `opponentLeadId`, depuis les ouvertures B du même run. Indiquer « Back observé face à notre sélection recommandée » ; conserver les effectifs et expliquer que les présences individuelles ne sont pas des catégories exclusives.
- [ ] Avant B, montrer l’attente du calcul des backs, pas une liste vide équivalant à zéro occurrence.
- [ ] Tester la disparition du titre et des actions, la conservation des fréquences/leads, les backs après ACB, la navigation entre leads et les états A/AC.

## Tâche 3 — Remplacer le contenu droit de Lead & pick

**Fichiers :** modifier `src/app/features/matchup/lead-pick.ts`, `lead-pick.html`, éventuellement `lead-pick.css`, créer/compléter `lead-pick.spec.ts`. Créer `src/app/core/matchup/battle-action-display.ts` et son test pour le formatage partagé.

**Interfaces :** input `openings: OpeningsDisplay | null`, état de disponibilité explicite ; `formatBattleAction(action, ourSnapshot, opponentSnapshot)` résout chaque acteur et cible selon son propre `side`. Conserver les inputs de sélection/comparaisons/affinage utiles.

- [ ] Garder la colonne gauche intacte sur le fond : nos quatre, lead/back et justification C. Après AC, la sélection doit déjà s’afficher, avec la zone droite « Les ouvertures pour cette sélection seront calculées à l’étape suivante ».
- [ ] Construire les cartes depuis tous les leads A, triés par leur fréquence A. Après B, chaque carte affiche les deux distributions structurées et leurs effectifs. Ne pas limiter cette zone à `studiedLeadIds` du top C.
- [ ] Mettre en évidence notre recommandation, puis les alternatives dans un détail repliable. Côté adverse, afficher le choix le plus fréquent puis ses alternatives ; une paire reste une décision simultanée de deux Pokémon, pas deux fréquences individuelles recombinées.
- [ ] Résoudre correctement acteur adverse, attaque sur allié, ciblage de soi-même, zone, switch et tera. Le `formatAction` actuel suppose notre acteur et une cible adverse : le remplacer par le formateur bilatéral testé ; aucune substitution de noms de capacités dans le template.
- [ ] Afficher les fréquences comme `n/N` et pourcentage arrondi, avec le contexte « Notre quatre/lead fixés ». Ajouter l’explication que les choix adverses et les nôtres sont calculés avant résolution ; aucune flèche causale entre les deux distributions.
- [ ] Maintenir les « Compositions comparées » C et l’affinage D à leur place, distincts des nouvelles ouvertures. Si D existe, ses chiffres ne doivent pas écraser les choix B. Les observations B apparaissent dans un détail de la carte concernée.
- [ ] Tester AC sans ouvertures, ACB complet, échec B avec AC conservé, matchup sans analyse après nettoyage, quatrième lead hors top C, zéro valeur invalide, ex æquo déjà départagé côté serveur et deux équipes contenant un même nom de Pokémon. Vérifier clavier, mobile et thèmes clair/sombre.

## Tâche 4 — Ordre de progression, lancement et continuation

**Fichiers :** modifier `src/app/core/python/analysis-api.models.ts`, `analysis-api.ts`, les services de lancement/commandes en attente existants, `features/matchup/analysis-controls.ts/html`, `matchup.ts/html`, `core/graphql/coach-mappers.ts` et leurs tests.

- [ ] Lire `phaseOrder` des capacités et afficher A→C→B→D ; déterminer la prochaine phase et la cible maximale avec cet ordre, jamais avec l’ordre alphabétique ou l’ancien tableau constant. Après D, afficher le checkpoint disponible sans présenter l’analyse comme entièrement terminée ni proposer une phase non disponible.
- [ ] Conserver les corps start/continue existants, sans champ de version supplémentaire. Préserver clé et corps exact des nouvelles commandes incertaines. À la bascule coordonnée avec le nettoyage, vider les caches d’analyses et le stockage local des anciennes commandes en attente avant de réactiver les lancements ; ne pas les renvoyer automatiquement après la purge serveur. Documenter ce nettoyage dans la recette locale.
- [ ] Après C, permettre Continuer vers B ; sur cible B dès le départ, comprendre que C sera calculée avant. Une ancienne URL dont le run a été supprimé revient à l’état sans analyse du matchup avec une possibilité de relance ; aucun affichage depuis le cache obsolète.
- [ ] Mettre à jour les messages de progression : « Sélection de notre équipe » en C, « Étude des ouvertures face à notre sélection » en B. Le passage de PENDING GAME SIMULATIONS à PENDING STATS est normal ; ne pas afficher une régression.
- [ ] Conserver le polling seulement pour queued/running, le runId dans l’URL, l’affichage des checkpoints et les gardes de requêtes/révisions obsolètes. Les deux snapshots, la sélection et les ouvertures doivent tous provenir du run sélectionné.
- [ ] Tester capacités incomplètes, réponse obsolète, ancienne URL après nettoyage et absence de renvoi d’une commande locale purgée. La livraison frontend/backend est coordonnée ; aucun mode de compatibilité avec l’ancien backend n’est prévu.

## Tâche 5 — Recette intégrée et documentation

**Fichiers :** créer `e2e/conditioned-openings.spec.ts`, `e2e/conditioned-openings-live.spec.ts`, `docs/recette-ouvertures-conditionnees.md` dans le dépôt Angular ; adapter `package.json` et les tests de création automatique existants.

- [ ] E2E contrôlé : ouvrir un run AC, constater notre sélection à gauche et l’attente à droite ; continuer B et faire apparaître actions adverses + recommandation pour plusieurs leads. Vérifier l’absence du bloc d’actions dans « Opponent Leads », puis les backs et observations à leurs emplacements prévus.
- [ ] E2E après nettoyage : équipes/matchups conservés, aucune analyse affichée, ancienne URL sans résultat récupéré du cache ; lancer un nouveau run et vérifier ses checkpoints. Tester aussi la navigation entre deux nouveaux runs sans mélange de données.
- [ ] Recette réelle après le plan backend : nouveau run smoke jusqu’à C, puis B, puis D. Vérifier même runId, même sélection C, fréquences et recommandations identiques au JSON PostGraphile, cibles lisibles et persistance après refresh. Aucun mock de Python/GraphQL dans cette recette.
- [ ] Rejouer avec les budgets standard effectivement configurés dans `simulation_budgets.py`, sans imposer les anciens volumes documentaires. Confirmer que B couvre tous les leads A et que son mode de notre côté est celui affiché comme recommandation.
- [ ] Exécuter `devbox run test`, `devbox run lint`, `devbox run build` depuis la racine Angular, puis les E2E ciblés. Mettre à jour le README et la recette avec les runIds, versions, limites et résultats de vérification.

## Critères de fin

- « Opponent Leads » présente les leads et leurs backs ; son ancienne section d’actions T1 a disparu.
- « Lead & pick » conserve notre sélection à gauche et présente à droite les ouvertures des deux côtés **pour cette sélection**, face à chaque lead adverse.
- Fréquences de choix et taux de victoire ne sont pas confondus ; le frontend ne fabrique aucune recommandation ni correspondance entre réponses adverses et nôtres.
- Le nouvel ordre, les résultats partiels jusqu’à D et le redémarrage après nettoyage sont traités explicitement, sans compatibilité historique.
