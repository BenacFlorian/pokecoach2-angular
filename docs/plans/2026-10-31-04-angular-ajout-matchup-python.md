# Plan 4 — Appeler Python automatiquement à l’ajout d’un matchup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lorsque l’utilisateur valide un nouvel adversaire, enregistrer le matchup puis demander automatiquement son analyse à Python et ouvrir le run correspondant.

**Architecture:** Conserver la création atomique adversaire + matchup via PostGraphile. Enchaîner ensuite une commande FastAPI idempotente portant sur le matchup créé. PostGraphile reste la source des statuts et résultats ; un échec de lancement Python ne supprime pas le matchup enregistré.

**Tech Stack:** Angular 22 existant, HttpClient, RxJS, signals, PostGraphile, FastAPI, tests Vitest et Playwright. Aucun calcul de simulation dans Angular.

**Spec:** Demande utilisateur ; [workflow Python, §2](../../../pokecoach2-python/docs/specs/2026-10-31-workflow-analyse-matchup.md) ; [socle Python, notamment tâche 4](../../../pokecoach2-python/docs/plans/2026-10-31-04-socle-workflow-python.md) ; [règles du workspace](../../../agent.md).

## Périmètre et état constaté

- `TeamDetail.onOpponentSubmitted()` appelle actuellement `CoachStore.createOpponentMatchup()`, ajoute le résultat à la liste puis ferme la modal. Sa branche de réconciliation peut aussi retrouver une mutation réussie dont la réponse a été perdue : les deux chemins devront converger vers le lancement Python.
- `CoachApi.createOpponentMatchup()` crée déjà adversaire et matchup dans une mutation imbriquée ; ne pas la remplacer par deux écritures séparées.
- Le formulaire accepte URL Poképaste et texte Showdown. Conserver les deux modes, leur parsing et leurs erreurs.
- `src/proxy.conf.json` possède déjà `/api-python` vers `127.0.0.1:8042` : vérifier ce raccordement, ne pas en créer un concurrent.
- Au moment de cette rédaction, Python expose santé et seed de démonstration. `POST /api-python/matchups/{matchup_id}/analyses` et `GET /api-python/analysis-capabilities` sont **prévus**, mais pas encore implémentés dans `src/pokecoach_python`.
- Ne jamais appeler `/api-python/demo/seed` depuis l’ajout d’un adversaire : cette commande réinstalle un scénario fixe et ne traite pas le matchup saisi.

## Dépendances et coordination des plans

Pour une recette réelle, réaliser les [adaptations SQL/lecteur progressif](../../../pokecoach2-python/docs/plans/2026-10-31-03-adaptations-resultats-progressifs.md), le socle Python et au moins la phase A. Le développement Angular peut utiliser des réponses contrôlées en tests avant leur disponibilité ; le parcours réel ne doit pas simuler une acceptation Python.

Ce plan précise **le déclenchement automatique après création**, en complément du lancement manuel et de la continuation prévus dans le socle. Réutiliser `AnalysisApi`, les types, contrôles et lecteurs de run s’ils existent déjà lors de l’exécution. Ne pas créer deux clients ou deux mécanismes de polling.

Respecter les skills [angular-developer](../../../.agents/skills/angular-developer/SKILL.md) et [design-system](../../../.agents/skills/design-system/SKILL.md). Conserver la présentation et les trois onglets validés. Les nouvelles chaînes utilisent les mécanismes i18n existants ; la santé d’une opération est aussi indiquée par du texte, pas seulement par une couleur.

## Parcours attendu

1. L’utilisateur ouvre « Préparer un match up », renseigne nom et équipe adverse, puis choisit le format compatible si nécessaire.
2. La validation importe les six Pokémon et crée adversaire + matchup, avec la réglementation, dans PostgreSQL via GraphQL.
3. Dès que l’enregistrement est confirmé, Angular appelle Python une seule fois pour cette commande logique. Un retry réseau conserve la même clé d’idempotence.
4. À la réception du run, fermer la modal, rafraîchir la liste et naviguer vers `/teams/{teamId}/matchups/{matchupId}?runId={runId}`. Ne pas attendre la fin des simulations pour naviguer.
5. La page lit ce run via PostGraphile et affiche sa progression, puis ses résultats partiels ou complets selon les phases disponibles.
6. Si Python échoue après la création, conserver le matchup et proposer de réessayer **le lancement de son analyse**, sans recréer ni adversaire ni matchup.

Le profil automatique est `standard`. Capturer la dernière phase disponible au moment de la soumission et la transmettre explicitement ; la cible reste identique lors d’un retry. Lorsque toutes les phases sont disponibles, cette cible est `synthesis`. Le choix avancé du profil smoke et les continuations restent dans les contrôles de la page matchup.

## Contrat d’appel

```http
POST /api-python/matchups/{matchup_id}/analyses
Content-Type: application/json
Idempotency-Key: <UUID stable pour ce lancement>

{"targetPhase":"A","profile":"standard"}
```

`A` est un exemple de cible, pas une constante à coder. Réponse initiale 202 : `{matchupId, runId, source:"simulation", status:"queued", processStatus:"INITIAL"}`. Une commande déjà traitée peut renvoyer 200 et un run en pause ou terminal ; accepter ce cas sans lancer un second run. Valider les UUID, l’identité du matchup et le statut renvoyé avant navigation.

Le format est enregistré dans `core.matchups.regulation` avant le POST, conformément au contrat backend. Il n’est pas déduit du Poképaste. Mapper les capacités depuis le contrat OpenAPI effectivement livré ; ne pas inventer les noms de champs d’une réponse encore non implémentée.

## Points de revue

| Cas | Résultat attendu | Tâches |
| --- | --- | --- |
| Double clic / double abonnement RxJS | Une création et une commande logique de lancement | 2–3 |
| Réponse GraphQL perdue après commit | Réconciliation par UUID puis lancement sur le matchup retrouvé | 2 |
| Python indisponible après création | Matchup conservé, retry du seul POST Python | 2–3 |
| Réponse Python perdue après création du run | Même clé et même corps au retry, aucun run supplémentaire | 1–2 |
| Navigation, fermeture de modal ou refresh pendant le lancement | Pas d’écriture sur la mauvaise page ; récupération du lancement non confirmé | 2–4 |

## Tâche 1 — Client Python et format du matchup

**Fichiers** relatifs à `pokecoach2-angular/pokecoach-angular/` : créer ou compléter `src/app/core/python/analysis-api.ts`, `analysis-api.spec.ts`, `analysis-api.models.ts` et `analysis-error.ts` ; modifier `src/app/core/graphql/coach-api.ts`, `coach-store.ts` dans `core/data`, `coach-dto.ts`, `coach-operations.ts`, `coach-mappers.ts` dans `core/graphql` et les tests associés.

**Interfaces :** réutiliser `AnalysisApi.capabilities()` et `AnalysisApi.start(matchupId, request, key)` du socle. Vue frontend normalisée des capacités : formats compatibles, phases disponibles et profils. Étendre `createOpponentMatchup(ids, teamId, name, imported, regulation)` dans API et store.

- [ ] Relever le contrat OpenAPI livré par Python et introspecter les champs GraphQL de création/lecture de `regulation`. Ajouter les DTO et validations runtime nécessaires ; les fixtures de tests suivent ce contrat.
- [ ] Écrire les tests HttpClient : URL relative correcte, header stable, corps exact, réponse 202, réponse idempotente 200, UUID invalide, réponse d’un autre matchup et erreur HTTP. Ne pas ajouter de `retry()` générique sur le POST.
- [ ] Ajouter `regulation` à la mutation atomique existante et aux lectures du matchup. Tester que le format est persisté dans la même mutation que l’adversaire et le matchup, avant tout appel Python.
- [ ] Mapper séparément les erreurs de capacités, GraphQL et lancement Python. Un 409 demande une relecture des runs existants ; un 422 demande de corriger format/cible ; une panne réseau ou 503 permet de réessayer. Un run existant ne doit pas être présenté comme celui de notre commande sans preuve de correspondance.
- [ ] Exécuter les tests ciblés avec `npm test -- --watch=false` et vérifier les assertions de requêtes attendues/absentes. Le proxy existant conserve le préfixe `/api-python`.

## Tâche 2 — Orchestrer création puis lancement, avec reprise

**Fichiers :** créer `src/app/core/matchup/matchup-preparation.ts`, `matchup-preparation.spec.ts`, `src/app/core/python/pending-analysis-command.ts` et son `.spec.ts`.

**Interfaces :** `MatchupPreparation.submit(teamId, payload, regulation, targetPhase): void`, `retryAnalysis(matchupId): void`, état exposé par signal. Le service détient une seule exécution et ses abonnements ; les vues observent son état sans déclencher à nouveau un Observable froid.

États : `idle`, `creating`, `reconciling`, `starting-analysis`, `accepted`, `creation-error`, `analysis-error`. L’état mémorise `teamId`, UUID adversaire/matchup, clé de lancement, corps immuable du POST et, après acceptation, `runId`.

- [ ] Écrire les tests d’ordre : avant confirmation GraphQL, zéro POST Python ; après confirmation, un POST pour le bon matchup ; erreur définitive de création, zéro POST. Deux soumissions simultanées n’ouvrent pas deux chaînes.
- [ ] Générer les UUID de création et la clé d’analyse une seule fois par soumission logique ; capturer teamId et payload. Un retry utilise ce payload figé. Ne pas réutiliser des UUID d’une opération dont l’issue est inconnue pour un autre adversaire ou un texte modifié.
- [ ] Converger la réussite de création et sa réconciliation vers une seule méthode interne `startSavedMatchup`. Après erreur réseau de création, lire le matchup par ses UUID et vérifier équipe/adversaire avant de poursuivre ; absence confirmée autorise le retry de création avec les mêmes UUID, lecture en erreur laisse l’état incertain.
- [ ] Avant le POST Python, conserver dans `sessionStorage` un marqueur versionné limité à `teamId`, `matchupId`, clé et corps de commande. Il sert à retrouver un lancement non confirmé après refresh, pas à stocker équipes ou rapports. Gérer indisponibilité/corruption du stockage sans casser les lectures métier.
- [ ] Si Python échoue, passer en `analysis-error` en conservant l’identité du matchup déjà créé. `retryAnalysis()` ne rappelle jamais `createOpponentMatchup()` et garde la même clé pour toute issue incertaine. Un changement explicite de paramètres après rejet définitif constitue une nouvelle commande, avec nouvelle clé.
- [ ] Après acceptation validée, effacer le marqueur et conserver runId. Si la lecture GraphQL du run échoue ensuite, réessayer seulement cette lecture. Si un marqueur subsiste au retour sur la page, proposer la réconciliation/reprise du lancement ; aucun nouveau run automatique au simple chargement d’une page.
- [ ] Tester perte de réponse après commit GraphQL, perte de réponse POST, retry deux fois, reprise depuis marqueur, marqueur invalide et changement d’équipe. Fermer une vue ne doit ni déclencher une nouvelle commande ni être assimilé à une annulation du traitement serveur.

## Tâche 3 — Brancher le formulaire existant et les états utilisateur

**Fichiers :** modifier `src/app/features/team-detail/team-detail.ts`, `team-detail.html`, créer/compléter `team-detail.spec.ts` ; modifier `src/app/shared/teams/team-import-dialog.ts`, `team-import-dialog.html` et ses tests. Préserver le parcours `own-team`.

**Interfaces :** étendre `TeamImportSubmit` avec `regulation?: string`. Le champ est obligatoire pour le contexte adversaire ; fournir les formats autorisés au dialogue par input. Les imports personnels ne demandent pas de réglementation.

- [ ] Charger les capacités à l’ouverture du formulaire adverse et afficher un choix de format accessible. Présélectionner seulement s’il existe un unique format compatible ; sinon demander un choix explicite. Sans capacités ou phase disponible, garder le formulaire et afficher l’indisponibilité avec retry, sans lancer une création vouée à un appel inconnu.
- [ ] Remplacer l’enchaînement local de `onOpponentSubmitted` par `MatchupPreparation.submit`. Conserver import/parsing, verrouillage des doubles clics et contexte de l’équipe capturé. Libérer les anciens `pendingMatchupIds` uniquement après réconciliation ou abandon résolu de cette opération.
- [ ] Afficher distinctement « Enregistrement du matchup… » puis « Lancement de l’analyse… ». Dès confirmation GraphQL, faire apparaître le matchup dans la liste ; ne pas lui attribuer un statut queued avant acceptation Python.
- [ ] Sur acceptation, fermer le dialogue et naviguer vers le matchup avec son runId, seulement si l’utilisateur consulte toujours le contexte de soumission. Sinon, conserver le résultat de l’opération sans le rediriger vers une ancienne équipe.
- [ ] Après échec Python, fermer le formulaire d’import désormais enregistré et afficher une alerte liée au matchup : « Le matchup est enregistré, mais son analyse n’a pas pu être lancée. Réessayez le lancement. » Bouton « Réessayer l’analyse », sans demande de ressaisir l’équipe. Conserver ce feedback après fermeture volontaire de la modal.
- [ ] Tester Escape et fermeture du dialogue pendant une requête : la fermeture rend le focus et ne prétend pas annuler une écriture déjà partie ; l’opération reste suivie hors modal et ses erreurs visibles. Ne pas laisser un backdrop contourner les gardes de double soumission. Si l’utilisateur change de route, empêcher les callbacks de modifier la nouvelle équipe.
- [ ] Respecter les textes i18n, labels, `role=status`/`role=alert`, focus clavier et charte de feedback. Ne pas refondre le formulaire réactif existant pour cette fonctionnalité.
- [ ] Tester URL Poképaste et texte Showdown, format manquant, création personnelle inchangée, fermeture/nouvelle ouverture, erreur de création et erreur Python avec leurs actions distinctes.

## Tâche 4 — Arrivée sur le run et tests du parcours complet

**Fichiers :** réutiliser/compléter `src/app/features/matchup/matchup.ts/html` et les lecteurs/store du socle ; créer `e2e/matchup-create-analysis.spec.ts`, `e2e/matchup-create-analysis-live.spec.ts` ; modifier `package.json` et `README.md` du dépôt Angular.

- [ ] Lire `runId` dans l’URL et vérifier son appartenance au matchup affiché. Réutiliser le polling existant pour queued/running et l’arrêter en paused/terminal ou au départ de la page. Aucune commande de création d’analyse ne part depuis un effet de chargement de cette page.
- [ ] Conserver les résultats partiels du run sélectionné et l’accès aux anciens runs. Ne pas remplacer la réponse Python par un faux rapport ni mélanger son run avec le dernier succès d’un autre traitement.
- [ ] Ajouter un E2E contrôlé : import → mutation GraphQL → POST Python → navigation runId → polling/résultat. Vérifier précisément un appel de création et une commande de lancement ; un rafraîchissement de page ne relance rien.
- [ ] Ajouter un E2E de panne : mutation réussie, POST indisponible, puis retry réussi. Vérifier un seul adversaire et un seul matchup, même clé de commande et aucun appel à `/demo/seed`. Ajouter le cas POST accepté mais réponse perdue, retrouvée par la même clé.
- [ ] Ajouter le script `e2e:matchup-analysis-live` pour la suite live. Sur une stack dédiée avec API/worker et au moins A, créer un nouvel adversaire depuis l’interface et constater le run créé automatiquement, les observations réelles puis leur persistance après refresh. Ne pas intercepter FastAPI/PostGraphile dans cette recette ; documenter le format et la cible disponibles.
- [ ] Exécuter depuis la racine Angular `devbox run test`, `devbox run lint`, `devbox run build`, puis les E2E concernés. Vérifier aussi les routes via le proxy Docker configuré dans conception si ce mode est utilisé ; ne pas confondre une page HTML de fallback avec une réponse API.
- [ ] Documenter les dépendances Python, le parcours automatique et la reprise sur erreur dans le README. Distinguer ce que vérifient les tests contrôlés et la recette réelle ; sans route d’analyse disponible, cette dernière reste explicitement non validée.

## Critères de fin

- Valider l’ajout d’un matchup déclenche automatiquement l’analyse du **matchup créé** après confirmation de sa persistance.
- Le frontend ouvre le run accepté et lit ses résultats par PostGraphile, y compris lorsqu’ils sont encore partiels.
- Erreurs, réponses perdues et doubles clics ne provoquent pas de création supplémentaire ; un échec Python laisse le matchup réutilisable.
- Aucun appel automatique à la réinstallation de seed, aucun calcul dans Angular et aucun changement des règles déterministes/LLM du workflow.
