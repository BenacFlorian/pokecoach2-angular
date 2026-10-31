# Plan 3 — Connecter toute l’interface Angular à PostGraphile

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le stockage navigateur et les données fictives générées par Angular par les équipes, matchups et préparations réellement persistés et exposés par PostGraphile.

**Architecture:** Un client GraphQL fondé sur HttpClient, des opérations explicites, des adaptateurs validant les documents JSON et un store de présentation à base de signals. Les pages conservent leur interface actuelle, mais deviennent asynchrones. Les rapports sont lus depuis les préparations enregistrées ; aucun résultat n’est calculé ou fabriqué dans le navigateur.

**Tech Stack:** Angular 22 existant, TypeScript, HttpClient, RxJS, signals, PostGraphile v4, tests Angular/Vitest et Playwright. Aucun besoin d’Apollo ou de NgRx pour ce périmètre.

**Spec:** Demande utilisateur du 31 octobre 2026 ; [règles du workspace](../../../agent.md) ; [contrat SQL actuel](../../../pokecoach2-conception/docs/data-contract.md) ; [modèles Angular](../../pokecoach-angular/src/app/core/models/matchup.model.ts) ; [serveur PostGraphile actuel](../../../pokecoach2-postgraphile/src/server.ts).

**Statut :** plan uniquement. L’audit préalable a effectué une introspection et des requêtes de lecture sur `http://127.0.0.1:4042/graphql`. Aucune mutation, migration ou modification d’application n’a été exécutée.

## Contraintes globales

- Préserver les pages, leur présentation validée, les détails des Pokémon au survol et les trois onglets `Opponent Leads`, `Lead & pick`, `Gameplan`.
- Respecter les skills [angular-developer](../../../.agents/skills/angular-developer/SKILL.md) et [design-system](../../../.agents/skills/design-system/SKILL.md) pour les états et messages ajoutés.
- PostgreSQL devient l’unique source de vérité métier. Ne plus lire ni écrire `pokecoach.demo.v1`, ne plus initialiser de démo automatiquement et ne pas revenir aux mocks en cas d’erreur réseau.
- Ne pas supprimer les anciennes données du navigateur : une éventuelle migration/import de celles-ci est hors de ce chantier.
- Conserver les services d’import URL Poképaste/texte Showdown, le parser et les images PokéAPI. Leur rôle ne change pas.
- Les mocks restent autorisés dans les tests seulement ; aucun scénario de démonstration embarqué dans le parcours de production.
- Aucun mot de passe SQL, rôle administrateur, secret worker ou faux JWT dans Angular.
- Ne pas développer Python, VGC-Bench ou un LLM dans ce plan. Le frontend lit les états et résultats produits en base ; il n’accorde pas de droits supplémentaires au navigateur pour écrire des rapports.

## Audit effectué et décisions qui en découlent

### Frontend actuel

| Élément | Comportement observé | Changement prévu |
| --- | --- | --- |
| `CoachStore` | Charge localStorage puis injecte des équipes et un rapport de démo | Cache mémoire alimenté exclusivement par GraphQL |
| `coach-storage.ts` | Lit/écrit `pokecoach.demo.v1` | Retirer du runtime, conserver les anciennes données utilisateur sans les toucher |
| `MockMatchupPreparation` | Génère un rapport, écrit un console.log, attend 400 ms | Supprimer ; enregistrer le matchup via mutation serveur |
| `Home` | Ajout synchrone d’équipe | Mutation puis confirmation serveur avant fermeture de la modal |
| `TeamDetail` | Chaque matchup a obligatoirement un rapport fictif | Liste réelle pouvant contenir un matchup sans préparation ou une analyse en cours/échouée |
| `Matchup` | Résout notre équipe courante et réinitialise les onglets à chaque modification du store | Résout les instantanés du rapport ; préserve la sélection pendant les rafraîchissements |
| `TeamImportDialog` | Ferme automatiquement l’import personnel après parsing | Distingue parsing et sauvegarde, reste ouverte jusqu’au succès de la mutation |
| `lead-pick.html`, `matchup.html` | Mention de démonstration inconditionnelle | Mention liée à la provenance du rapport réellement reçu |
| E2E existant | Efface localStorage et attend un résultat instantané | Scénarios GraphQL contrôlés et recette réelle sur base de test |

Le serveur est désormais dans `pokecoach2-postgraphile/`. L’ancien mini-package `pokecoach2-conception/docker/postgraphile/` n’existe plus : ne pas le recréer pour ce raccordement.

### Contrat GraphQL confirmé par introspection

| Besoin | Nom réel et champs utiles |
| --- | --- |
| Équipes | `teams(first, after, condition, orderBy)` → `nodes`, `pageInfo`, `totalCount` ; `team(id: UUID!)` |
| Matchups | `matchups(first, after, condition, orderBy)` ; `matchup(id: UUID!)` |
| Relations | `Matchup.ourTeam`, `.opponentTeam`, `.matchupRuns`, `.latestSuccessfulRun` |
| Préparations | `MatchupRun.status`, `.processStatus`, `.source`, `.reportVersion`, `.report`, les deux snapshots, dates et provenance |
| Équipe à créer | `createTeam(input: CreateTeamInput!)` avec `input.team` |
| Matchup à créer | `createMatchup(input: CreateMatchupInput!)` avec `input.matchup` |
| Adversaire imbriqué | `input.matchup.teamToOpponentTeamId.create` accepte les données d’une équipe |
| Ordre des listes | `[CREATED_AT_DESC, ID_DESC]` disponible sur les trois connexions |
| Progression GraphQL | `INITIAL`, `PENDING_STATS`, `PENDING_GAME_SIMULATIONS`, `SUCCESS`, `ERROR` |

Les lectures des listes, relations et du dernier succès ont réussi. La présence d’une mutation dans l’introspection **ne prouve pas** que son exécution est autorisée : les mutations d’écriture et leur atomicité restent à tester sur une base dédiée.

### Frontière entre données persistées et simulation réelle

- La base contient déjà des rapports `source = mock`. Ils proviennent bien de PostGraphile mais restent des données de démonstration ; conserver cette indication pour ces rapports uniquement.
- Le rôle `authenticated_user` peut insérer équipes et matchups. Il n’a pas les droits d’insertion des runs ; aucune mutation racine `createMatchupRun` n’est exposée.
- `Préparer un match up` enregistre donc ici une équipe adverse et un matchup **sans run**. Afficher ensuite « Matchup enregistré — aucune analyse disponible ». Ne pas afficher `queued`/`INITIAL` s’il n’existe pas de run et ne pas laisser tourner un loader de simulation.
- Un futur worker ou une mutation serveur dédiée lancera une préparation. Ce raccordement ne fait ni appel Python ni écriture de run via une mutation imbriquée pour contourner les droits.
- Un rapport `simulation` ne sera rendu que si son `reportVersion` et sa structure sont effectivement pris en charge. Ne pas supposer un contrat métier encore inexistant ; afficher un état de format non pris en charge plutôt que convertir arbitrairement le JSON.

## Identités et états à rendre explicites

- `matchupId` est toujours `core.matchups.id`, dans les routes et les listes.
- `runId` identifie une préparation. Il ne remplace jamais le matchup dans l’URL.
- `latestRun` sert à présenter le traitement le plus récent ; `latestSuccessfulRun` sert à lire le dernier rapport réussi. Ce sont deux informations distinctes.
- Si un ancien rapport existe et qu’un nouveau run est en cours ou échoue, afficher l’ancien rapport avec sa date et un état séparé pour le dernier traitement. Ne pas le présenter comme le résultat du run récent.
- Si un rapport est affiché, **les deux équipes et tous les slots proviennent de ses snapshots**. Sans rapport, le bandeau utilise les relations d’équipes courantes.

| État observé | Affichage |
| --- | --- |
| Requête en cours, aucune donnée | Skeleton de la zone |
| Aucun matchup | Liste vide, action d’ajout disponible |
| Matchup sans run | Bandeau et message d’absence d’analyse ; pas de chiffres, pas de loader |
| `queued` / `INITIAL` | « Analyse en attente » |
| `running` / `PENDING_STATS` | « Calcul des statistiques » |
| `running` / `PENDING_GAME_SIMULATIONS` | « Simulations des parties en cours » |
| `succeeded` / `SUCCESS` et rapport compatible | Afficher les trois onglets |
| `failed` / `ERROR` | Message d’échec ; ancien succès éventuellement disponible |
| `cancelled` | « Analyse annulée », même si `processStatus = ERROR` |
| Source/version inconnue, snapshot ou rapport invalide | Message de données non prises en charge, aucun plantage ni résultat reconstruit |
| Erreur HTTP/GraphQL | Message + « Réessayer » ; ne pas confondre avec une liste vide ou une ressource introuvable |

`status` et `processStatus` doivent être lus ensemble ; un nouveau processStatus inconnu sur un run actif donne un libellé générique « Analyse en cours ».

## Points de revue prioritaires

| Risque | Vérification propriétaire |
| --- | --- |
| HTTP 200 contenant `errors`, ou JSONB incompatible | Tâches 2–3 : erreurs explicites, validation runtime |
| Réponse de l’équipe A écrasant celle de B après navigation | Tâche 4 : annulation des lectures et garde par clé de requête |
| Adversaire créé sans son matchup, double clic ou réponse de mutation perdue | Tâches 1 et 5 : atomicité et rapprochement par UUID |
| Statut récent mélangé à l’ancien rapport / mauvaise équipe historique | Tâche 6 : dernier run séparé du dernier succès, snapshots |
| Développement fonctionnel mais Docker renvoyant index.html pour `/graphql` | Tâche 2 et recette Docker : proxy HTTP dédié |

## Fichiers concernés

Sauf mention contraire, chemins relatifs à `pokecoach2-angular/pokecoach-angular/`.

| Fichier / groupe | Action |
| --- | --- |
| `src/proxy.conf.json`, `angular.json` | Proxy de développement vers PostGraphile |
| `src/app/core/graphql/graphql-client.ts`, `graphql-error.ts` | Transport GraphQL et traitement uniforme des erreurs |
| `src/app/core/graphql/coach-operations.ts`, `coach-dto.ts` | Opérations nommées, fragments partagés et types de réponses |
| `src/app/core/graphql/coach-api.ts` | Service métier de lecture/écriture |
| `src/app/core/graphql/coach-mappers.ts`, `report-validator.ts` | Mapping/validation JSONB et snapshots |
| `src/app/core/models/team.model.ts`, `matchup.model.ts` | Entités persistées et préparation facultative |
| `src/app/core/data/coach-store.ts` | Remplacer le stockage local par les états asynchrones |
| `src/app/core/data/coach-storage.ts`, `mock-matchup-preparation.ts` | Supprimer après retrait de leurs consommateurs |
| `src/app/core/data/demo-teams.ts`, `demo-reports.ts`, tests liés | Déplacer les fixtures utiles sous `src/testing/fixtures/`, supprimer le générateur inutilisé |
| `src/app/features/home/home.{ts,html}` | Chargement liste et mutation d’ajout |
| `src/app/features/team-detail/team-detail.{ts,html}` | Équipe, liste réelle, création matchup et états |
| `src/app/features/matchup/matchup.{ts,html}` | Lecture indépendante, snapshots, rapport facultatif, polling |
| `src/app/features/matchup/lead-pick.{ts,html}`, `opponent-leads.{ts,html}`, `gameplan.{ts,html}` | Réutiliser le rendu, gérer tableaux vides et provenance |
| `src/app/shared/teams/team-import-dialog.{ts,html}` | Cycle parsing → sauvegarde, erreurs, fermeture au succès |
| `src/testing/fixtures/`, `e2e/fixtures/` | Mocks exclusivement destinés aux tests |
| `e2e/coach.spec.ts`, `e2e/coach-live.spec.ts`, `playwright.config.ts` | Tests interceptés et recette réelle séparée |
| `../README.md`, `package.json` si script ajouté | Utilisation, lancement et commandes de vérification |

Évolutions de support hors du dépôt Angular à inscrire dans l’exécution : `pokecoach2-conception/docker/nginx.conf` pour le proxy Docker, son Compose pour l’ordre de démarrage si nécessaire, et correction des seuls droits SQL bloquants si les tests de la tâche 1 les confirment. Aucun changement de moteur métier.

## Tâche 1 — Verrouiller le contrat d’écriture avant le raccordement

**Fichiers :** tests de contrat GraphQL dans `src/app/core/graphql/coach-api.spec.ts`, documentation d’intégration. Si nécessaire, nouvelle migration corrective et callback dans le dépôt conception, après lecture de ses `AGENTS.md`.

**Interfaces :** `createTeam` pour nos équipes ; `createMatchup` avec création imbriquée de l’adversaire. Le succès signifie des écritures confirmées par le serveur.

- [ ] Relancer l’introspection et comparer les champs du tableau précédent. Ne pas coder les anciens noms PostGraphile `allTeams` ou `teamById`, absents du schéma actuel.
- [ ] Vérifier les droits d’écriture sous le rôle réellement utilisé par PostGraphile sur une **base de test isolée**. Le code actuel du callback révoque `PUBLIC EXECUTE` sur `core.current_actor()` et `core.is_valid_pokemon_slot_entry(jsonb)` sans les réaccorder explicitement à `authenticated_user`, alors que les triggers/contraintes les appellent en contexte invoker. C’est un risque de blocage d’insertion identifié dans les sources, non validé par une mutation pendant la rédaction.
- [ ] Si confirmé, corriger précisément ces droits auxiliaires via une nouvelle migration/callback approprié et un test de non-régression. Ne jamais passer le frontend en superuser, élargir les droits sur les rapports ou modifier une migration déjà appliquée pour contourner le problème.
- [ ] Tester réellement une création d’équipe et une création imbriquée adversaire + matchup. Forcer l’échec du matchup (notre équipe absente/archivée) et vérifier qu’aucun adversaire orphelin n’est conservé. Ne pas supposer l’atomicité du plugin sur la seule base de son nom.
- [ ] Si le plugin n’assure pas ce contrat, ajouter une mutation SQL transactionnelle ciblée avec les mêmes entrées/sorties dans conception, au lieu de deux requêtes frontend avec compensation fragile. Relever son nom GraphQL réel avant de continuer.
- [ ] Ne pas tester l’écriture sur les données personnelles ni modifier les rapports existants. Documenter l’endpoint de la base de test et les résultats des vérifications.

**Forme disponible par introspection, à confirmer par le test d’intégration :**

```graphql
mutation CreateOwnedTeam($input: CreateTeamInput!) {
  createTeam(input: $input) {
    team { id kind name sourceKind sourceUrl sourceText pokemon dataVersion createdAt isDeleted }
  }
}

mutation CreateOpponentMatchup($input: CreateMatchupInput!) {
  createMatchup(input: $input) {
    matchup {
      id ourTeamId opponentTeamId createdAt isDeleted
      opponentTeam { id kind name sourceKind sourceUrl sourceText pokemon dataVersion createdAt isDeleted }
    }
  }
}
```

La variable de la seconde mutation contient `matchup: { id, ourTeamId, teamToOpponentTeamId: { create: { id, kind: "opponent", name, sourceKind, sourceUrl, sourceText, pokemon } } }`. Ne pas envoyer `opponentTeamId` en plus d’une création imbriquée, ni de `report`, snapshot ou audit.

## Tâche 2 — Transport GraphQL et connectivité dev/Docker

**Interfaces :** `GraphqlClient.execute<T>(operationName: string, query: string, variables: Record<string, unknown>): Observable<T>` ; token injectable `GRAPHQL_ENDPOINT` valant `/graphql` par défaut ; erreur discriminée réseau/GraphQL/format.

- [ ] Configurer `src/proxy.conf.json` et le target `serve` pour `/graphql` et `/graphql/**` vers `http://127.0.0.1:4042`. Le navigateur parle à son origine Angular ; la cible hôte reste une configuration de développement. Voir le [proxy Angular CLI](https://angular.dev/tools/cli/serve#proxying-to-a-backend-server).
- [ ] Dans le Nginx Docker existant, ajouter une location GraphQL avant le fallback SPA vers `http://postgraphile:4000`, sans changer le chemin `/graphql`. Adapter démarrage/résolution DNS pour que le nom PostGraphile soit disponible. Aucun `localhost:4042` comme cible depuis le conteneur.
- [ ] Implémenter les POST `{operationName, query, variables}` avec HttpClient. Un document constant et des variables remplacent toute interpolation de noms d’équipe ou de texte Showdown dans la requête.
- [ ] Rejeter une réponse contenant `errors`, même avec HTTP 200 et données partielles. Les pages du POC ne publient pas un nouvel état depuis une réponse partielle ; conserver éventuellement le dernier état validé avec un message d’échec de rafraîchissement. Voir le [format des réponses GraphQL](https://graphql.org/learn/response/).
- [ ] Définir un timeout et aucune relance automatique de mutation. Ne pas installer un intercepteur ajoutant des headers GraphQL à PokéAPI/Poképaste.
- [ ] Tester succès, HTTP 500, timeout, `data: null`, HTTP 200 + `errors`, réponse HTML du proxy et annulation d’une lecture avec `HttpTestingController`. Utiliser les [outils de tests HTTP Angular](https://angular.dev/guide/http/testing).
- [ ] Vérifier une lecture réelle via le proxy de développement et le proxy Docker. Aucun secret SQL ne doit apparaître dans les assets Angular.

## Tâche 3 — Modèles, opérations et validation des données

**Interfaces frontend :**

- `Page<T> = { items: T[]; endCursor: string | null; hasNextPage: boolean }`.
- `MatchupSummary` : `id`, `teamId`, `opponent`, `createdAt`, `latestRun: RunSummary | null`, `hasSuccessfulReport`.
- `RunSummary` : `id`, `status`, `processStatus`, `source`, `createdAt`, `finishedAt`.
- `RunResult` : résumé, `reportVersion`, `report`, `ourTeamSnapshot`, `opponentTeamSnapshot` validés ensemble.
- `MatchupDetail` : identité du matchup, équipes courantes, dernier run et `successfulResult` discriminé absent/valide/incompatible. Ne plus imposer `PreparedMatchup.report` à tous les matchups.
- `CoachApi.listOwnedTeams(after?: string): Observable<Page<Team>>` ; `getOwnedTeam(id: string): Observable<Team | null>`.
- `CoachApi.listMatchups(teamId: string, after?: string): Observable<Page<MatchupSummary>>` ; `getMatchup(teamId: string, matchupId: string): Observable<MatchupDetail | null>`.
- `CoachApi.createOwnedTeam(requestId: string, name: string, imported: ImportedTeam): Observable<Team>` ; `createOpponentMatchup(ids: { matchupId: string; opponentId: string }, teamId: string, name: string, imported: ImportedTeam): Observable<MatchupSummary>`.

- [ ] Écrire les DTOs de réponses selon l’introspection. Traiter les scalaires JSON comme `unknown`, pas comme des objets métier fiables par simple assertion TypeScript.
- [ ] Définir des fragments Team/Run partagés et des opérations nommées dans `coach-operations.ts`. Accueil : `teams(condition: {kind: "owned", isDeleted: false}, first: 50, after: $after, orderBy: [CREATED_AT_DESC, ID_DESC])`. Listes de matchups : condition `ourTeamId` et `isDeleted: false`.
- [ ] Exposer un bouton « Charger la suite » ou un équivalent sobre alimenté par `pageInfo`. Tester plus de 50 équipes et matchups, déduplication par ID et remise à zéro des curseurs quand le parent change ; aucune limite silencieuse aux 50 premières lignes.
- [ ] Charger chaque détail indépendamment de la liste d’accueil. Vérifier UUID, `kind = owned`, archivage et appartenance `ourTeamId === teamId`. Une relation nullable doit être gérée ; ne pas classifier une panne réseau comme 404.
- [ ] Dans la liste, demander uniquement les champs nécessaires, le résumé de `matchupRuns(first: 1, orderBy: [CREATED_AT_DESC, ID_DESC])` et l’existence du dernier succès. Dans le détail, charger aussi les snapshots et le report de `latestSuccessfulRun`. Aucun téléchargement de tous les rapports de toutes les équipes ni N+1 par ligne.
- [ ] Mapper `sourceKind/sourceText/sourceUrl` vers `Team.source`, normaliser les champs optionnels JSON null en absence, vérifier six slots ordonnés, capacités/tableaux, UUID et `dataVersion` compatible. Ne pas reparser la source distante à chaque lecture.
- [ ] Valider le rapport courant : racines, tableaux, références de slots 0–5, paires/quatre distincts, effectifs et références de leads/actions nécessaires au rendu. Les tableaux vides sont légitimes ; un rapport/snapshot invalide n’est pas remplacé par un exemple. Conserver toutes les données utiles aux trois onglets.
- [ ] Pour la version mock v1 actuelle, conserver `fixtureVersion` ; ne pas rendre cette propriété obligatoire pour toute future source `simulation`. Une source/version sans décodeur défini reste non prise en charge.
- [ ] Tester mapping de null, six slots, source URL/texte, équipe archivée, mismatch parent, JSON malformé, version inconnue, tableaux vides et récupération des snapshots historiques.

## Tâche 4 — Store asynchrone et lecture de toutes les pages

**Interfaces :** `CoachStore` conserve les signals de présentation, mais chaque ressource expose un état `idle/loading/ready/error/not-found` et une action explicite de chargement/rechargement. Le cache ne survit pas au rechargement du navigateur.

- [ ] Retirer l’initialisation `seedDemoOnce`, les appels `loadCoachSnapshot/saveCoachSnapshot`, `storageWarning`, `snapshot()` et le helper de reset du stockage. Aucun accès `localStorage` dans le flux métier.
- [ ] Implémenter les chargements depuis CoachApi : `loadTeams`, `loadMoreTeams`, `loadTeam(teamId)`, `loadMatchups(teamId)`, `loadMoreMatchups(teamId)`, `loadMatchup(teamId, matchupId)`, plus rafraîchissements explicites.
- [ ] Utiliser les changements d’inputs de route avec `switchMap`/destruction et des clés de ressources pour empêcher une réponse A tardive de remplacer B. Une mutation envoyée au serveur n’est pas réputée annulée parce que la page a changé.
- [ ] Adapter Home : skeleton initial, liste paginée, vide réel sans invitation à retrouver des exemples, erreur et bouton de reprise. Conserver le rendu des lignes existant.
- [ ] Adapter TeamDetail : bandeau chargé par ID, liste dépendante, états sans rapport/traitement/échec, absence de mélange entre équipes. Conserver le bouton et le parcours existants.
- [ ] Adapter Matchup pour accès direct et rechargement d’URL : récupérer les données même si le store est vide. Séparer équipe inexistante, matchup d’un autre parent, données invalides et backend indisponible.
- [ ] Tester navigation A→B pendant une lecture, accès profond avec cache vide, page suivante tardive après changement de parent et réessai après erreur. Vérifier qu’aucune donnée de démo n’apparaît pendant ces transitions.

## Tâche 5 — Écritures réelles et modal sans fermeture prématurée

**Interfaces :** `TeamImportDialog.submitted` continue à émettre `{name, imported}` ; le parent pilote `saving`, `saveError` et appelle `close()` uniquement après succès confirmé. Le parsing et la sauvegarde possèdent des états distincts.

- [ ] Corriger le cycle de la modal : ne plus fermer `own-team` dès que le parser réussit ; ne pas remettre `resolving` à false après l’avoir activé via un appel d’annulation mal ordonné. Retirer les textes « Préparation de démonstration… ».
- [ ] Pour notre équipe, appeler `createOwnedTeam`, intégrer la réponse valide/invalider la liste puis fermer. Garder nom et source en cas d’erreur serveur. Un échec de rafraîchissement après mutation réussie ne doit pas proposer de recréer l’équipe.
- [ ] Pour un adversaire, utiliser la mutation imbriquée validée en tâche 1. Ajouter uniquement le matchup confirmé, rester sur le détail de notre équipe et afficher l’absence d’analyse sans générer de rapport.
- [ ] Générer des UUID **une seule fois par soumission logique** : équipe personnelle = requestId utilisé comme `team.id` ; adversaire + matchup = deux IDs réutilisés sur réessai. Ils identifient une écriture distante, pas une sauvegarde locale. `clientMutationId` seul n’est pas une garantie d’idempotence.
- [ ] Après une réponse perdue/timeout, rapprocher l’ID via `team(id)` ou `matchup(id)` avant toute relance. Vérifier que les champs reçus correspondent à l’intention ; si absent, réutiliser les mêmes IDs. Ne pas créer de nouvelles identités sur un simple double clic.
- [ ] Bloquer les doubles soumissions et changements de source pendant la sauvegarde. Autoriser la fermeture de la modal en expliquant que l’enregistrement déjà envoyé peut aboutir ; au retour/refocus, relire la liste. Ne jamais annoncer un rollback serveur à cause d’un `unsubscribe`.
- [ ] Brancher réellement `cancelled` sur les parents pour le parsing ; Escape, focus et fermeture programmatique doivent avoir des comportements cohérents. Le succès tardif ne ferme pas une autre modal et n’ajoute pas le résultat à une autre équipe.
- [ ] Tester mutation en échec avec saisie conservée, double clic, réponse perdue puis rapprochement, création atomique, fermeture/navigation pendant mutation et retour à une liste relue depuis la base.

## Tâche 6 — Rapports enregistrés, progression et polling

**Fichiers :** page Matchup, trois onglets, adaptateurs et tests de store/page.

- [ ] Afficher les onglets seulement lorsqu’un rapport compatible existe ; sinon garder le bandeau et un état contextualisé. Si les leads/back sont vides dans un rapport valide, afficher une absence d’observations, jamais les anciennes statistiques fictives.
- [ ] Alimenter tous les composants avec le même `RunResult` validé, et donc les mêmes snapshots. Supprimer l’utilisation de l’équipe courante pour les actions et les recommandations d’un rapport historique.
- [ ] Remplacer les labels de démonstration codés en dur dans `matchup.html` et `lead-pick.html` par une information de provenance : `mock` reste « Rapport de démonstration enregistré ». Un rapport inconnu ne reçoit pas automatiquement une étiquette « simulation réelle ».
- [ ] Conserver l’onglet et le lead sélectionnés lors d’un rafraîchissement du même rapport. Réinitialiser à l’arrivée sur un autre matchup ; lors d’un nouveau rapport, préserver le lead s’il existe encore, sinon sélectionner le premier selon la fréquence.
- [ ] Ajouter un rafraîchissement manuel. Pour des runs `queued/running` visibles, interroger toutes les 5 secondes avec une seule requête en vol ; suspendre quand l’onglet navigateur est caché et reprendre par une lecture immédiate au retour.
- [ ] Arrêter le polling sur sortie de page, erreur réseau (bouton de reprise), état terminal ou absence de run actif. Sans run, pas de boucle d’attente ; une lecture au retour de focus/rafraîchissement manuel permettra de détecter une préparation créée plus tard.
- [ ] Dans une liste comportant plusieurs analyses actives, rafraîchir la page de liste visible en une requête ; ne pas créer un timer et une requête par carte. Ne pas recharger les gros rapports pendant le polling de liste.
- [ ] Tester `INITIAL → PENDING_STATS → PENDING_GAME_SIMULATIONS → SUCCESS`, failed, cancelled, statut inconnu, panne et reprise. Les réponses intermédiaires sont simulées **dans les tests** ; le frontend ne déclenche jamais ces transitions.
- [ ] Tester un ancien succès avec nouveau run échoué/en cours et un changement d’équipe depuis le rapport : bonne provenance/date, bons Pokémon et aucune confusion de statut. Ne pas afficher `errorMessage` technique brut ; proposer une action utilisateur et journaliser les détails utiles sans données sensibles.

**Limite backend à conserver dans la recette :** le trigger SQL actuel de transitions peut refuser un UPDATE gardant `status = running` tout en changeant seulement `process_status`. Cela ne bloque pas la lecture/polling ; tester et corriger côté conception lors du raccordement du worker si nécessaire, sans faire simuler la progression par Angular.

## Tâche 7 — Retirer les mocks de production et adapter les tests

**Fichiers :** anciens fichiers core/data, fixtures, specs du parser/rapport, E2E et documentation.

- [ ] Déplacer les textes Showdown et rapports utiles aux tests dans `src/testing/fixtures/` ou `e2e/fixtures/`. Mettre à jour les tests du parser qui importent aujourd’hui `demo-teams.ts`.
- [ ] Supprimer du runtime `coach-storage.ts`, `mock-matchup-preparation.ts`, le seed et le générateur `buildMockMatchupReport`. Retirer les tests qui ne valident plus qu’un générateur supprimé ; conserver/remplacer les assertions utiles par des tests de validation des données serveur.
- [ ] Vérifier par recherche l’absence de `MockMatchupPreparation`, `buildMockMatchupReport`, `DEMO_*`, `[mock] prepare-matchup`, `pokecoach.demo.v1` et accès localStorage dans les fichiers applicatifs hors tests. Ne pas effacer les docs historiques, ni supprimer le support de lecture `source: mock`.
- [ ] Modifier `e2e/coach.spec.ts` pour intercepter `/graphql` **par operationName et variables**, avec un état serveur de test distinct du navigateur. Couvrir liste vide, ajout URL/texte, pagination, matchup sans run, rapport enregistré complet, polling et erreurs.
- [ ] Tester avec un ancien `pokecoach.demo.v1` présent : l’application doit ignorer son contenu et afficher la réponse GraphQL, sans supprimer ni modifier cette ancienne sauvegarde.
- [ ] Ajouter `e2e/coach-live.spec.ts` séparé, exécuté explicitement contre une stack de test réelle : création équipe/adversaire/matchup, rechargement et **nouveau contexte navigateur** retrouvant les mêmes données. Ne pas intercepter GraphQL dans cette suite ; PokéAPI/Poképaste peuvent être contrôlés indépendamment.
- [ ] Préparer les runs pour les tests réels par un outil de seed worker/admin sur la base dédiée, jamais depuis le navigateur. Conserver les refus d’écriture de reports par l’API. Ne pas faire de nettoyage destructif sur la base personnelle.
- [ ] Documenter base/API à démarrer, proxy, sources de vérité, absence d’import automatique de l’ancien stockage, absence de moteur Python et différence entre rapport mock enregistré et simulation réelle.

## Tâche 8 — Recette finale et critères d’acceptation

- [ ] Depuis `pokecoach2-angular/`, exécuter `devbox run lint`, `devbox run test`, `devbox run build` et les E2E interceptés avec le script existant. Fournir un script distinct `e2e:live` pour la suite réelle, qui doit refuser une URL de test non explicitement fournie.
- [ ] Vérifier création et lecture via le rôle PostGraphile réel sur la base dédiée ; documenter les correctifs BDD de support s’ils ont été nécessaires. Un test HTTP intercepté ne remplace pas ce contrôle.
- [ ] Vérifier les parcours en développement et depuis le profil Docker frontend, y compris les URL profondes et les requêtes `/graphql` sous Nginx.
- [ ] Contrôler clavier/modal, onglets, messages accessibles, rendu mobile et clair/sombre. La structure visuelle validée reste en place ; seuls les états nécessaires au réseau et aux données absentes sont ajoutés.
- [ ] Vérifier que les trois onglets affichent exclusivement le rapport reçu et ses instantanés. Aucun remplacement silencieux en cas de rapport partiel, incompatible ou absent.
- [ ] Vérifier que les mutations réussies restent visibles après rechargement et depuis un autre contexte navigateur ; aucune donnée métier n’est persistée par Angular.
- [ ] Consigner les commandes réellement exécutées, les résultats et les limites. Ne pas déclarer les simulations opérationnelles parce que PostgreSQL fournit un rapport de démonstration.

**Fin attendue :** toute la donnée métier de l’application vient de PostGraphile ; équipes et matchups sont créés en base ; les préparations existantes, leurs statuts et leurs rapports sont affichés correctement. Un matchup nouvellement enregistré reste sans analyse jusqu’à ce qu’un backend réel en produise une.
