# Plan d'implémentation — accueil équipes, détail et recherche des matchups

> **Pour Composer / agent exécutant :** utiliser `superpowers:executing-plans` si disponible, tâche par tâche, et `superpowers:verification-before-completion` avant de conclure. Cocher les tâches après leur validation.

**Objectif :** proposer le parcours accueil des équipes → matchups d'une équipe → analyse d'un matchup, avec ajout, suppression confirmée et recherche par Pokémon adverse.

**Architecture :** consolider `Home`, `TeamDetail`, `Matchup` et `TeamImportDialog`. Conserver `CoachApi` pour GraphQL, `CoachStore` pour les données et l'isolation des requêtes, `MatchupPreparation` pour la création d'un matchup. Une seule modale partagée de suppression sert les deux écrans.

**Stack :** Angular standalone et signals, RxJS, Reactive Forms existants, Transloco FR/EN, Tailwind préfixé `tw:` et daisyUI, Vitest et Playwright. Conserver les versions installées, sans migration de framework.

**Spécification :** [README commun](../../../README-refonte-equipes-matchups.md). Étape 3, après [conception](../../../pokecoach2-conception/docs/plans/2026-11-08-equipes-matchups.md) et [Python](../../../pokecoach2-python/docs/plans/2026-11-08-equipes-matchups.md).

## Contraintes globales

- Tous les chemins `src/...`, `public/...` et `e2e/...` ci-dessous sont relatifs à `pokecoach2-angular/pokecoach-angular/`. Les plans restent dans `pokecoach2-angular/docs/plans/`.
- Lire les skills locaux `angular-developer` et `design-system` à l'exécution. Suivre les patterns du projet, sans ajouter une librairie de composants ou un store externe.
- Les équipes viennent de GraphQL, pas du stockage navigateur. Ne pas introduire d'équipe globale sélectionnée : l'UUID de la route définit toujours le contexte.
- Pas d'analyse automatique après création. Ne pas modifier les algorithmes ou contrôles de progression/résultat du détail matchup.
- Recherche côté serveur sur l'espèce adverse, y compris après le 50e matchup ; `250 ms` de debounce, pagination de `50`, tri `[CREATED_AT_DESC, ID_DESC]`.
- Suppression physique par la mutation unique validée au plan conception, jamais par une boucle de DELETE depuis le navigateur.
- Toute nouvelle chaîne visible, erreur, aide et nom accessible possède une clé FR et EN.

## Points de revue

1. Réponse tardive d'une autre équipe ou d'un ancien filtre : ne modifie jamais la liste courante.
2. Réponse perdue après création/suppression : réconciliation, pas de doublon ni faux succès.
3. Clic de suppression sur une carte : ouvre la confirmation sans naviguer dans l'équipe.
4. Ancienne URL ou analyse supprimée dans un autre onglet : état introuvable, pas de polling infini ni d'ancien rapport affiché.
5. Modale au clavier et page étroite : boutons accessibles, focus restauré, erreur visible et possibilité de réessayer.

## Ce qui existe déjà

| Zone | Fichiers | Travail attendu |
| --- | --- | --- |
| Routes | `src/app/app.routes.ts` | Conserver `/`, `/teams/:teamId`, `/teams/:teamId/matchups/:matchupId` et la route NotFound. |
| Accueil des équipes | `src/app/features/home/home.ts`, `home.html` | Déjà branché sur les équipes owned et la modale d'import. Fiabiliser et ajouter la suppression. |
| Détail d'équipe | `src/app/features/team-detail/team-detail.ts`, `team-detail.html` | Déjà une liste de matchups liée à teamId. Ajouter filtre, retour et suppression. |
| Import | `src/app/shared/teams/team-import-dialog.ts`, `.html`, `.css` | Réutiliser le parsing Poképaste/Showdown et la validation de six Pokémon. |
| API et DTO | `src/app/core/graphql/coach-api.ts`, `coach-operations.ts`, `coach-dto.ts`, `coach-mappers.ts` | Ajouter suppression et remplacer la lecture de liste par la recherche paginée. |
| Store | `src/app/core/data/coach-store.ts` | Étendre la clé de requête au filtre et invalider les réponses périmées. |
| Création matchup | `src/app/core/matchup/matchup-preparation.ts` | Retirer la navigation automatique de `finishCreatedMatchup`, isoler les tentatives par équipe. |
| Analyse | `src/app/features/matchup/matchup.ts`, `.html`, `analysis-controls.ts` | Conserver le démarrage explicite ; gérer la disparition de la ressource. |
| Navigation | `src/app/shared/layout/navbar.ts`, `.html` | Retour vers l'équipe déjà présent depuis un matchup ; conserver ce lien. |

Ne pas suivre les anciens plans qui décrivaient un frontend uniquement mocké ou des dépôts backend vides. Le code actuel est la référence.

## Tâche 1 — contrats GraphQL et tests API

**Modifier :** `core/graphql/coach-operations.ts`, `coach-dto.ts`, `coach-api.ts`, `coach-api.spec.ts`. Ajuster `coach-mappers.ts` et son test seulement si le type de page évolue.

**Prérequis :** lire le livrable `pokecoach2-conception/docs/contrats/2026-11-08-equipes-matchups-graphql.md`, créé à l'étape conception. Ne pas supposer les noms d'arguments/types générés.

**Interfaces cibles de CoachApi :**

```ts
listMatchups(teamId: string, speciesQuery = '', after?: string): Observable<Page<MatchupSummary>>;
deleteOwnedTeam(teamId: string): Observable<string>; // UUID confirmé
ownedTeamExists(teamId: string): Observable<boolean>; // pour réconciliation uniquement
```

- [ ] Écrire les tests API avant le changement : query + teamId + curseur transmis, suppression avec l'UUID exact, payload incohérent rejeté, erreur GraphQL propagée même si HTTP 200.
- [ ] Conserver le nom d'opération client `ListMatchups`, mais remplacer son champ par `matchups: searchTeamMatchups(...)`. Ajouter la variable `$speciesQuery: String` et réutiliser les fragments de résumé actuels, y compris statuts et dernier rapport réussi.
- [ ] Garder `nodes`, `pageInfo` et `totalCount` dans la sélection. Pour les états vides, la présence d'un filtre suffit ; ne pas faire une seconde requête non filtrée à chaque frappe.
- [ ] Créer `DELETE_OWNED_TEAM`, opération `DeleteOwnedTeam`, avec l'input et le retour `deletedTeamId` réellement validés. Vérifier que l'UUID retourné correspond à la cible avant d'annoncer un succès.
- [ ] `ownedTeamExists` lit la présence brute de `team(id)` et son kind, sans assimiler une erreur réseau à une absence ni utiliser le mapper qui masque `isDeleted`. Une ligne owned archivée existe encore physiquement et ne suffit pas à confirmer un hard delete.
- [ ] Le filtre est trimé ; SQL assure la casse. Une entrée vide doit être envoyée comme chaîne vide. Ne pas encoder les `%` en jokers ou construire une requête GraphQL par interpolation de texte utilisateur.
- [ ] Mettre à jour **tous** les appels existants de `listMatchups` : l'ancien deuxième argument était le curseur, il devient la recherche. Préférer une migration complète des callsites à une surcharge ambiguë.
- [ ] Exécuter `npm test -- --watch=false --include=src/app/core/graphql/coach-api.spec.ts` ; attendre tous les tests verts.

## Tâche 2 — store : contexte équipe + recherche + pagination

**Modifier :** `core/data/coach-store.ts`, `coach-store.spec.ts`.

**Interfaces cibles :**

```ts
loadMatchups(teamId: string, speciesQuery = '', delayMs: 0 | 250 = 0): void;
loadMoreMatchups(teamId: string, speciesQuery = ''): void;
clearMatchupListContext(teamId: string): void;
// Réutiliser invalidateAll() existant en lui donnant une sémantique de production :
invalidateAll(): void;
```

- [ ] Tests avec Observables contrôlables : réponse A après navigation vers B, réponse filtre X après frappe de Y, résultat de pagination après changement de filtre. Les anciennes réponses doivent être ignorées, même si l'unsubscribe n'empêche pas leur arrivée dans le double de test.
- [ ] La clé de liste doit contenir `teamId` et la recherche normalisée, accompagnée d'un compteur de génération. Réinitialiser items, erreurs, curseur, `hasNextPage` et `loadingMore` à chaque changement de contexte.
- [ ] `loadMatchups` invalide immédiatement la génération précédente, annule requête ET timer, et place la liste en chargement. Si `delayMs = 250`, retarder uniquement le départ HTTP : ne pas laisser l'ancienne réponse rester admissible pendant le debounce.
- [ ] Utiliser le mécanisme RxJS/timer déjà compatible avec le store ; stocker la souscription et la nettoyer. Les captures de teamId, filtre, génération et curseur sont immuables pour chaque requête.
- [ ] `loadMoreMatchups` utilise exclusivement le curseur du contexte courant et refuse un double clic tant qu'une page arrive. Dédupliquer les UUID à l'ajout comme aujourd'hui ; ne pas fusionner des pages de recherches différentes.
- [ ] Une erreur de première page reste une erreur, pas un état vide. Une erreur de page suivante conserve les éléments précédents et autorise de réessayer le même curseur.
- [ ] `clearMatchupListContext(teamId)` n'efface que si cet UUID est encore le contexte courant ; annuler aussi le timer. Appeler cette méthode quand la page d'équipe est détruite. Une transition tardive depuis A ne doit pas effacer la liste de B.
- [ ] Avant même de refuser un UUID invalide dans les méthodes de détail/liste, incrémenter la génération et annuler les requêtes précédentes : sinon une réponse valide ancienne peut remplacer l'état introuvable.
- [ ] Auditer `appendMatchup` : ne jamais ajouter sans contrôle une création de A dans la liste de B ou dans une recherche incompatible. Le nouveau parcours utilisera un rechargement de première page sans filtre après création ; supprimer cet append de ce parcours.
- [ ] `invalidateAll()` doit annuler les lectures, incrémenter les générations et vider détails, listes et run sélectionné. Cette méthode est utilisable après une suppression, pas seulement un helper de test. Elle ne supprime aucune autre donnée serveur.
- [ ] Vérifier les tests existants de génération et ajouter la saisie pendant debounce, le curseur périmé et l'UUID invalide après une requête lancée.
- [ ] Exécuter `npm test -- --watch=false --include=src/app/core/data/coach-store.spec.ts`.

## Tâche 3 — fiabiliser l'ajout d'équipe sur l'accueil

**Modifier :** `features/home/home.ts`, `home.html`, `shared/teams/team-import-dialog.ts`, `.html`. **Créer :** `features/home/home.spec.ts`, `shared/teams/team-import-dialog.spec.ts`.

- [ ] Conserver le chargement paginé des équipes owned, leurs noms et `TeamStrip`. Afficher l'état vide uniquement après une réponse réussie sans équipe, pas pendant le chargement ni après une panne.
- [ ] Conserver les deux modes d'import et le nom obligatoire trimé ; six Pokémon exactement selon le parser existant. Aucune réimplémentation du format Showdown dans Home.
- [ ] Après réussite, fermer la modale et recharger la liste, sans navigation. Vérifier que l'équipe ajoutée est visible en première page avec le tri actuel.
- [ ] Mettre création et réconciliation dans une même chaîne asynchrone : `savingTeam` reste vrai jusqu'au résultat final. Aujourd'hui le finalize de la création peut déverrouiller la modale avant la fin de la réconciliation.
- [ ] En cas de réponse perdue, rechercher le même UUID ; s'il existe, traiter la création comme réussie. Si absent, afficher une erreur réessayable. Si la réconciliation échoue aussi, conserver l'erreur et l'identifiant pour une tentative sûre, sans exception non gérée.
- [ ] Une tentative non résolue conserve son UUID et son payload initial. Ne pas renvoyer sous le même UUID un import différent en le présentant comme le résultat du premier ; résoudre/abandonner la tentative avant un nouvel import.
- [ ] Dans `TeamImportDialog`, empêcher submit, fermeture, backdrop et Échap pendant saving/reconciling. Avant soumission, Annuler/Échap ferment normalement et restaurent le focus ; une erreur terminée rend ces commandes disponibles.
- [ ] Nettoyer les souscriptions à la destruction. Une réponse d'une page quittée ne doit pas agir sur une ViewChild détruite ; ne pas prétendre que l'unsubscribe a annulé une transaction déjà reçue par le serveur.
- [ ] Tests : aucun POST Python à l'import d'équipe, double submit = une création, réponse perdue = une seule équipe, échec de réconciliation visible, nom vide/roster invalide refusés, focus restauré.
- [ ] Exécuter les deux nouveaux fichiers de test avec `npm test -- --watch=false --include=src/app/features/home/home.spec.ts --include=src/app/shared/teams/team-import-dialog.spec.ts`.

## Tâche 4 — création du matchup : rester dans l'équipe

**Modifier :** `core/matchup/matchup-preparation.ts`, son `.spec.ts`, `features/team-detail/team-detail.ts`. **Interfaces complémentaires :**

```ts
// MatchupPreparation : conserver submit(teamId, payload) et snapshot()
acknowledgeCreated(matchupId: string): void;
leaveTeam(teamId: string): void;
forgetTeam(teamId: string): void;
```

- [ ] Tester d'abord : création réussie → phase accepted avec teamId/matchupId, zéro navigation, zéro POST start, aucune insertion dans une liste d'une autre équipe.
- [ ] Dans `finishCreatedMatchup`, retirer `router.navigate`, l'append global et le rechargement inconditionnel de liste. Garder le résultat accepted jusqu'à consommation explicite ; ne pas l'effacer dans une microtask qui pourrait précéder l'effet Angular.
- [ ] Dans TeamDetail, consommer accepted seulement si son teamId est celui de la route courante : fermer l'import, vider le champ de recherche, appeler `store.loadMatchups(teamId, '', 0)`, puis `acknowledgeCreated(matchupId)`. Une seule consommation et un seul rechargement.
- [ ] `acknowledgeCreated` remet idle uniquement pour le résultat attendu. Ne pas effacer une nouvelle commande avec un identifiant ancien.
- [ ] Rattacher les UUID en attente à leur teamId et à la tentative d'import. La réconciliation après timeout utilise les mêmes identifiants ; changer d'équipe ne doit jamais réutiliser un matchupId/opponentId de l'équipe précédente.
- [ ] `leaveTeam` annule les callbacks UI et invalide la génération de la commande liée à cette équipe. Une création déjà committée reste en base et apparaîtra à la prochaine lecture ; aucune navigation automatique à son retour.
- [ ] `forgetTeam` nettoie les commandes de cette équipe supprimée et, s'il existe, le marqueur `pokecoach.pendingAnalysis.v1` uniquement lorsque son teamId correspond. Ne pas effacer un marqueur d'une autre équipe par défaut.
- [ ] Rechercher les usages des anciens chemins `retryAnalysis`, `launchAnalysis`, `resumePendingIfAny` et de leurs phases. Retirer les chemins devenus morts si aucun appelant ne reste ; ne pas réactiver un démarrage automatique en reprenant un ancien plan. Préserver le démarrage explicite d'`analysis-controls.ts`.
- [ ] Tests : réponse perdue puis réconciliation, filtre actif lors de création remis à vide, A quittée pour B pendant création, commande annulée puis nouvelle commande, tentative de A non réutilisée pour B.
- [ ] Exécuter `npm test -- --watch=false --include=src/app/core/matchup/matchup-preparation.spec.ts`.

## Tâche 5 — détail d'équipe, recherche et navigation

**Modifier :** `features/team-detail/team-detail.ts`, `team-detail.html`. **Créer :** `features/team-detail/team-detail.spec.ts`. Lire `shared/layout/navbar.ts`/`.html` et `app.routes.ts` ; ne les modifier que si nécessaire pour le contrat de navigation.

- [ ] Garder un en-tête avec nom, `TeamStrip`, lien « Mes équipes » vers `/`, action « Ajouter un matchup » et déclencheur de suppression.
- [ ] Ajouter un champ de recherche avec label visible « Rechercher un Pokémon adverse », aide « Nom Showdown, par exemple Incineroar », type search et bouton « Effacer ». Pas de filtre sur les noms d'équipes.
- [ ] Stocker la saisie dans un signal local. Chaque changement appelle `store.loadMatchups(teamId, saisie, 250)` ; initialisation, effacement et bouton réessayer utilisent `0`. Ne pas cumuler deux debounces dans la page et le store.
- [ ] Éviter les appels inutiles lorsque la valeur trimée n'a pas changé. Prévoir le cas de composition clavier ; ne pas lancer de recherche sur un texte encore en composition.
- [ ] Lors d'un changement de teamId, vider le filtre, quitter le précédent contexte de préparation, charger l'équipe et sa liste. L'effet de chargement d'équipe ne doit pas relancer `loadTeam` à chaque frappe.
- [ ] Le bouton « Charger plus » transmet le filtre courant ; les skeletons/erreurs appartiennent à la liste. Un filtre non vide sans résultat affiche « Aucun matchup avec ce Pokémon adverse » et propose d'effacer ; filtre vide sans résultat affiche l'invitation à ajouter le premier matchup.
- [ ] Chaque carte/lien ouvre le matchup sous l'UUID de l'équipe de la route. Le nombre total, s'il est affiché, est le total filtré renvoyé par GraphQL, jamais `items.length` présenté comme total général.
- [ ] Conserver le retour déjà disponible matchup → équipe ; ne pas utiliser `history.back()` comme seul retour, car un accès direct n'a pas forcément cet historique.
- [ ] Confirmer que les anciennes URL continuent à fonctionner. UUID absent/malformé → introuvable avec retour accueil ; équipe opponent en URL owned → introuvable.
- [ ] Tests avec fake timers : aucune requête avant 250 ms, une requête après, effacement immédiat, remise à vide en changeant d'équipe, recherche maintenue après erreur, filtre actif supprimé après ajout de matchup.
- [ ] Exécuter `npm test -- --watch=false --include=src/app/features/team-detail/team-detail.spec.ts`.

## Tâche 6 — suppression confirmée partagée

**Créer :** `shared/teams/team-delete-dialog.ts`, `.html`, `.spec.ts`. **Modifier :** Home, TeamDetail, leurs templates/tests ; utiliser les méthodes API/store/préparation des tâches précédentes.

**Interface publique du composant :**

```ts
open(team: Team, trigger: HTMLElement): void;
// output Angular : deleted = output<string>() ; valeur = UUID supprimé
```

- [ ] Réutiliser le pattern `<dialog>` natif de TeamImportDialog. Il n'y a pas de `ConfirmationDialogService` partagé dans ce dépôt à réutiliser ; ne pas importer le service illustré dans la documentation générique du design system.
- [ ] Le composant porte la cible, l'état de requête, l'erreur et la confirmation. Les pages fournissent l'équipe et réagissent à `deleted`; ne pas recopier la mutation dans Home et TeamDetail.
- [ ] Afficher le nom de l'équipe avec interpolation Angular, jamais `innerHTML`, et l'avertissement de suppression définitive des matchups/analyses y compris en cours. Focus initial sur « Annuler » ; Échap ferme sans mutation avant la confirmation.
- [ ] Au clic de confirmation : appeler `api.deleteOwnedTeam(id)` une seule fois, désactiver les commandes et afficher un spinner accompagné d'un libellé. Aucun appel Python préalable n'est requis pour annuler les runs : la cascade et le worker gèrent ce cas.
- [ ] Succès : `preparation.forgetTeam(id)`, `store.invalidateAll()`, fermer, émettre deleted. Home recharge `loadTeams`; TeamDetail navigue vers `/` uniquement si la page courante concerne encore cette équipe. Ne pas voler la navigation d'un utilisateur déjà parti ailleurs.
- [ ] Échec réseau/réponse incertaine : `ownedTeamExists(id)` ; absence certaine → même fin de succès, présence → erreur réessayable, nouvelle panne → état incertain explicitement réessayable. Pas de suppression optimiste définitive. Rejouer la mutation sur l'UUID est sûr par contrat idempotent.
- [ ] Échec métier explicite (rôle/kind/validation) : afficher l'erreur utilisateur, ne pas traiter automatiquement comme succès. Conserver les détails techniques dans les logs, pas dans le texte affiché.
- [ ] Annuler restaure le focus au déclencheur s'il est encore dans le DOM. Après suppression de la carte, placer le focus sur le titre de liste ou « Ajouter une équipe », pas sur un bouton supprimé.
- [ ] Dans Home, utiliser un conteneur de carte avec lien de navigation et bouton de suppression **frères**. Ne pas imbriquer le bouton dans un `<a>` et ne pas rendre toute la carte cliquable avec un handler qui intercepte le bouton.
- [ ] Tests : annuler/Échap = zéro mutation, confirmer = une mutation, double clic, erreur puis retry, réponse perdue puis absence, équipe nommée avec caractères HTML affichée en texte, cartes restantes conservées après rechargement.
- [ ] Tester le déclencheur du détail et de la carte avec la même modale. Vérifier qu'une mutation répétée d'équipe absente ne déclenche pas un nettoyage d'autres équipes.
- [ ] Exécuter `npm test -- --watch=false --include=src/app/shared/teams/team-delete-dialog.spec.ts` puis les tests Home/TeamDetail.

## Tâche 7 — ressources disparues et état de l'analyse

**Modifier au besoin :** `features/matchup/matchup.ts`, `.html`, `analysis-controls.ts`, `core/data/coach-store.ts`, `core/python/analysis-error.ts`, `pending-analysis-command.ts`. **Créer :** `features/matchup/matchup.spec.ts` si absent ; enrichir les tests du store.

- [ ] Tester un GET matchup qui devient null pendant le polling : vider l'ancien détail et le run sélectionné, arrêter le timer, afficher introuvable avec lien vers l'accueil. Ne pas garder le dernier rapport visible comme s'il existait encore.
- [ ] Un GET run null arrête le polling de ce run et déclenche une vérification du matchup pour distinguer run absent et matchup absent. Ne pas supprimer localement toute une équipe sur la seule absence d'un run.
- [ ] Vérifier que les refresh silencieux du store traitent une absence confirmée différemment d'une erreur réseau. Une panne réseau n'est pas la preuve d'une suppression.
- [ ] Sur HTTP 404 `MATCHUP_NOT_FOUND` ou `RUN_NOT_FOUND` après Analyser/Continuer/Annuler, arrêter l'action en cours et rafraîchir la ressource adéquate ; ne pas proposer de retry infini sur une ressource supprimée.
- [ ] Invalider timers/souscriptions lors de destruction ou changement de route et ignorer les réponses appartenant à une ancienne paire teamId/matchupId. Conserver la vérification existante qu'un matchup appartient au teamId de l'URL.
- [ ] Retirer un éventuel marqueur de commande de l'équipe disparue ; ne pas redémarrer automatiquement un POST depuis ce marqueur.
- [ ] Tests : suppression dans un autre onglet simulée par réponses null, route A avec matchup de B refusée, runId incompatible, erreur réseau conservée comme erreur, zéro intervalle actif après destruction.
- [ ] Rejouer les tests existants de la page matchup et des contrôles d'analyse : les actions explicites et rapports non supprimés fonctionnent comme avant.

## Tâche 8 — traductions, charte et tests de parcours

**Modifier :** `public/i18n/fr.json`, `public/i18n/en.json`, `e2e/fixtures/graphql-mock.ts`, `e2e/fixtures/analysis-api-mock.ts`, les scénarios existants qui attendaient une navigation après import. **Créer :** `e2e/team-lifecycle.spec.ts` et `e2e/team-lifecycle-live.spec.ts`.

- [ ] Ajouter les clés sous les namespaces existants de home/team/import, ou sous `teamDelete` et `matchupSearch` si plus lisible. Traduire titre, aide, erreurs, annulation, action en cours, avertissement et noms accessibles.
- [ ] Appliquer la charte aux zones touchées : racine de page `tw:h-full tw:flex tw:flex-col tw:gap-4 tw:pt-4`, cartes `base-100`/bordure `base-300`/`rounded-box`, sans ajouter un second padding de shell.
- [ ] Ajouter/importer = `tw:btn tw:btn-primary` ; retour/annuler = `tw:btn tw:btn-ghost` ; déclencheur suppression = `tw:btn tw:btn-error tw:btn-soft` ; confirmation = `tw:btn tw:btn-error`. Une seule action primary par zone. Pas de `btn-primary btn-soft`.
- [ ] Labels visibles, `aria-labelledby`/`aria-describedby` sur les dialogs, nom accessible et tooltip pour les boutons uniquement iconographiques, focus visible, erreurs avec `role="alert"`. Conserver le style des loaders du projet.
- [ ] Si aucun toaster partagé n'existe, afficher une erreur/action réussie dans la zone pertinente ; ne pas créer un framework de notifications pour ce chantier. Les échecs ne doivent jamais rester silencieux.
- [ ] Mettre à jour le mock GraphQL pour `ListMatchups` avec speciesQuery et pour `DeleteOwnedTeam`. Reproduire le contrat vérifié, pas un DELETE en plusieurs appels. Garder les mocks scoped à chaque test pour les exécutions parallèles.
- [ ] Dans `team-lifecycle.spec.ts`, couvrir accueil vide → A → matchup → clic détail → clic Analyser → résultat → retours → B. Compter les POST start : zéro avant le clic, un au clic.
- [ ] Ajouter recherche au-delà des 50 premiers éléments, saisie rapide/réponses inversées, annulation de suppression, suppression réussie/échouée, retour accueil, raccourcis clavier et affichage mobile.
- [ ] Mettre à jour `e2e/coach.spec.ts`, `matchup-create-analysis.spec.ts`, leurs variantes live et les autres callsites concernés : le test clique maintenant la carte matchup après sa création. Ne pas changer les attentes pour masquer une analyse démarrée trop tôt.
- [ ] `team-lifecycle-live.spec.ts` utilise le backend réel suivant les conventions live existantes et des UUID propres au test ; nettoyage uniquement de ces fixtures. Il vérifie la mutation et la recherche réelles. Pas de reset global de la base utilisateur.
- [ ] La suppression pendant une analyse se valide avec le backend stub/fixture et les barrières du plan Python, pas uniquement par une réponse mockée du navigateur.

## Tâche 9 — commandes de validation et compte rendu

Depuis `pokecoach2-angular/pokecoach-angular` :

```bash
npm run lint
npm test -- --watch=false
npm run build
npx playwright test e2e/coach.spec.ts e2e/team-lifecycle.spec.ts e2e/matchup-create-analysis.spec.ts e2e/matchup-single-page.spec.ts
```

Puis, avec la stack réelle configurée selon les conventions live du dépôt :

```bash
npx playwright test e2e/team-lifecycle-live.spec.ts
```

`npm run e2e` ne lance actuellement que `coach.spec.ts`. Ne pas le présenter comme une exécution des nouveaux tests ; utiliser la commande explicite ci-dessus ou ajouter un script nommé `e2e:teams` couvrant le nouveau parcours.

- [ ] Exécuter la [recette transversale du README](../../../README-refonte-equipes-matchups.md#recette-transversale-finale).
- [ ] Vérifier avec deux onglets que le prochain rafraîchissement d'un matchup supprimé donne introuvable et arrête le polling. Aucun besoin d'ajouter WebSocket ou BroadcastChannel.
- [ ] Ajouter un compte rendu dans `docs/recette-equipes-matchups.md` à la racine du dépôt Angular : commandes exécutées, résultats, captures éventuelles et contrôles live non exécutés, s'il y en a.
- [ ] Ne déclarer terminé que si l'ajout reste sur les listes, la recherche porte sur toutes les pages, la suppression est confirmée et atomique côté serveur, et les analyses restantes fonctionnent encore.

**Livrable final :** un parcours multi-équipe sans nouveau système parallèle, avec les mêmes analyses qu'aujourd'hui et une recherche fiable des matchups préparés.
