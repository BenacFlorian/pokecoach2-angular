# Plan 06b — Implémentation de la page matchup sans onglets

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réorganiser la page matchup en trois bandes, avec notre sélection et le gameplan à gauche, un accordéon de leads et d’ouvertures à droite, et deux modales pour les détails C/D.

**Architecture:** `Matchup` conserve les chargements, snapshots, commandes et polling ; les deux colonnes et les modales sont des composants de présentation. Extraire les contenus existants de `lead-pick` et `opponent-leads`, puis remplacer leur composition dans `matchup.html`. Un seul état d’accordéon, aucun nouveau store métier ni nouvel appel API.

**Tech Stack:** Angular standalone/signals, Transloco, Tailwind/DaisyUI, `CoachStore`, Vitest/TestBed et Playwright existants. Aucune nouvelle dépendance.

**Spec:** [Plan 06 — spec produit de la refonte](2026-11-01-06-matchup-page-refonte.md). Ce fichier est le plan d’exécution de cette spec ; il ne la remplace pas.

**Skills :** [angular-developer](../../../.agents/skills/angular-developer/SKILL.md), [design-system](../../../.agents/skills/design-system/SKILL.md), notamment ses références boutons, surfaces, typographie, feedback et accessibilité.

## 1. Contraintes et précisions issues du code

- **Angular seulement.** Aucun changement Python, SQL, schéma JSON, budget, sélection C, recommandation B ou agrégation D. Aucun nettoyage de base. Le contrat D global est déjà présent dans le frontend examiné.
- Garder le bandeau des équipes, les portraits et détails de sets, les routes et `runId`, l’idempotence des commandes, l’annulation, les gardes contre les réponses obsolètes et le polling de visibilité existants.
- Les notes de fin de T1 sont des observations **B**, pas A. Le mapper actuel laisse `OpponentLeadStats.turn1EndObservations` vide pour les simulations et fournit `OpeningStudyDisplay.endStateNotes`. Afficher ces dernières une seule fois, dans la moitié ouvertures ; ne pas inventer des notes A ni dupliquer B dans le panneau backs. Les notes distinctes déjà présentes dans un rapport de démonstration peuvent rester côté backs.
- `mapSimulationToTabDisplay` expose les comparaisons C mais transforme ses limitations en justification et ne transmet pas sa règle. Pour la modal C, exposer ces métadonnées **déjà reçues** via un modèle de présentation local ; aucun enrichissement GraphQL requis.
- `gameplan.html` est actuellement une grille à deux colonnes et contient aussi menaces, Pokémon à préserver/éliminer et adaptations. Empiler les quatre sections demandées en premier ; conserver les informations complémentaires existantes dans un détail repliable sous ces sections, dans la même colonne. Aucun appel LLM ni implémentation de E.
- `analysis-controls` porte déjà les appels start/cancel et leurs états. Le conserver et adapter son template ; ne pas déplacer cette logique dans un nouveau service pour une refonte visuelle.
- Les E2E actuels ne suffisent pas : `conditioned-openings.spec.ts` est un placeholder ignoré ; `global-refinement.spec.ts` teste le validateur JSON sans naviguer dans la page. Les compléter avec de vrais parcours navigateur.

## 2. Composition cible et responsabilités

Tous les chemins applicatifs ci-dessous sont relatifs à `pokecoach-angular/`, sauf indication contraire.

| Fichier/composant | Responsabilité et interface |
| --- | --- |
| `src/app/features/matchup/matchup.ts/html` | Orchestrateur existant ; fournit le contexte du run, ses snapshots et ses données aux enfants ; conserve chargement/polling/gestion des routes. |
| `analysis-controls.ts/html` | Bande analyse compacte ; inputs existants + `runStatus: RunStatusI18n \| null` ; conserve `runStarted` et `commandError`. |
| `matchup-left-column.ts/html` | Inputs `contextKey`, `ourTeam`, `opponentTeam`, `opponentLeads`, `recommendation`, `selectionDetails`, `refinement`, `gameplan`. Résumé de notre quatre/D, accès aux modales et gameplan vertical. Aucun accès API/store. |
| `matchup-right-column.ts/html` | Inputs `contextKey`, `ourTeam`, `opponentTeam`, `leads`, `openings`, `openingsPending`, `backsPending`. Tri des leads et signal local `expandedLeadId: string \| null`. |
| `opening-study-panel.ts/html` | Inputs `ourTeam`, `opponentTeam`, `lead: OpponentLeadStats`, `study: OpeningStudyDisplay \| null`, états d’attente. Ouvertures B à gauche, backs/marginales à droite ; pas d’état de sélection ni d’en-tête de lead dupliqué. |
| `refinement-scenarios-modal.ts/html` | Inputs snapshots et `refinement`. Méthodes `open(trigger: HTMLElement)` / `close()` ; histogramme et T1 D, limitations complètes. |
| `selection-detail-modal.ts/html` | Inputs snapshots, leads et `details: SelectionDetailsDisplay \| null`. Même interface open/close ; comparaisons, justification, limitations et règle C. |
| `gameplan.ts/html` | Conserver le composant existant, transformer uniquement sa présentation en pile verticale et utiliser Transloco. |
| `core/matchup/selection-details-display.ts` | Type et extraction pure de `SelectionDetailsDisplay` à partir des données C existantes. |
| `core/matchup/selection-display.ts` | Extraire le petit helper partagé d’ordre des quatre : lead ordonné puis backs ; pas de nouvelle règle de sélection. |

Les modales appartiennent à la colonne gauche, via `viewChild` ; il ne peut y avoir qu’une modal ouverte. Les enfants reçoivent un `contextKey` formé du matchup et du run sélectionné, **sans la révision**. Un changement de contexte ferme les modales et replie l’accordéon ; une mise à jour du même run conserve leur état quand les données restent disponibles.

Conserver les noms `SimulationTabDisplay` et `tabDisplay` internes pendant cette refonte pour réduire les changements du store. Renommer seulement les accesseurs de page `...ForTab(s)` et `showTabs` lorsqu’ils deviennent trompeurs. Ne pas ajouter de champ au contrat réseau pour ce renommage.

## 3. États progressifs attendus

| Données du run sélectionné | Colonne gauche | Colonne droite | Modales |
| --- | --- | --- | --- |
| Sans analyse / avant A | Message global « Pas encore calculé », aucune fausse sélection | Pas de faux leads | Fermées, aucun bouton actif |
| A | Sélection et gameplan non calculés | Leads A triés, dépliage possible avec message d’attente B | Aucune |
| AC | Notre quatre visible, gameplan non calculé | Mêmes leads, ouvertures et backs en attente | Détails C disponible |
| ACB | Notre quatre et détails C | Ouvertures, backs et marginales du lead déplié | Détails C disponible |
| ACBD | Notre quatre + résumé W/L/nuls et taux D | B inchangé | Détails C et scénarios D disponibles |
| Rapport avec gameplan disponible | Quatre puis gameplan empilé | Données déjà disponibles | Selon présence de C/D |
| Run arrêté/échoué après checkpoint | Conserver le dernier résultat partiel valide et le statut | Conserver les observations publiées | Selon données publiées |

Les messages d’attente doivent fonctionner dès A, même si `openingsPending` actuel ne devient vrai qu’après C : utiliser aussi `backsPending`/la présence des sections. Un run en pause ne doit pas afficher un spinner prétendant qu’une phase s’exécute. Une incompatibilité de données ou un run introuvable garde son message existant, sans mélange avec le résultat d’un autre run.

## 4. Points de revue

| Risque | Test propriétaire |
| --- | --- |
| Un polling rouvre un lead que l’utilisateur a refermé | Tâche 2 : accordéon et mises à jour du même contexte |
| Une modal montre les données du run précédent | Tâches 3 et 6 : changement de contexte, fermeture et snapshots |
| Attente B absente après A, ou états nuls interprétés comme statistiques à zéro | Tâches 1–2 et 7 : matrice progressive |
| Actions clavier déclenchant plusieurs contrôles imbriqués | Tâches 2–3 : bouton natif, focus et modales |
| Une colonne ou une modal devient inaccessible sur petit écran | Tâches 6–7 : scroll, débordements et parcours mobile |

## Tâche 1 — Préparer les données de présentation sans changer le contrat

**Créer :** `src/app/core/matchup/selection-details-display.ts`, `selection-details-display.spec.ts`, `selection-display.ts`, `selection-display.spec.ts`.

**Modifier :** `src/app/features/matchup/matchup.ts` pour exposer les données de sélection au futur composant ; réutiliser `simulation-display.ts`/les modèles existants, sans modifier les opérations GraphQL.

**Interfaces :** `SelectionDetailsDisplay = { comparisons: readonly SelectionResult[]; limitations: readonly string[]; selectionRuleVersion: string | null; justification: string | null }` ; `buildSelectionDetails(section: LeadPickSectionV2 | null, recommendation: LeadRecommendation | null, comparisons: readonly SelectionResult[] | null): SelectionDetailsDisplay | null` consomme les métadonnées C déjà validées et les comparaisons déjà mappées ; la recommandation sert de source de justification lorsque le chemin de démonstration ne fournit pas de section C. `orderFourLeadsFirst(four, lead)` conserve l’ordre de nos deux leads et trie seulement les backs.

- [ ] Écrire les tests : AC expose limitations/règle/comparaisons même si la liste de candidats est vide ; A ne fabrique pas de détails C ; le chemin de démonstration déjà pris en charge peut transmettre sa justification sans inventer une règle absente.
- [ ] Extraire le helper d’ordre des quatre de `lead-pick`, avec test d’un lead dont l’ordre est inversé par rapport aux slots triés. L’affichage ne change pas la sélection retenue.
- [ ] Raccorder l’extraction C au `SelectedRunView` sélectionné : `view.view.partialResult.leadPick` pour une simulation, modèle existant pour un rapport de démonstration. Ne pas lire les métadonnées d’un ancien succès lorsque le run sélectionné est différent.
- [ ] Conserver `OpeningStudyDisplay`, les formateurs d’actions/cibles et les mappers des backs existants. Pas de recalcul des fréquences, recommandations ou scénarios côté navigateur.
- [ ] Vérifier les tests unitaires des helpers et `simulation-display.spec.ts`. Résultat attendu : mêmes données métier, métadonnées C disponibles pour la modal.

## Tâche 2 — Construire l’accordéon et le panneau d’ouverture

**Créer :** `src/app/features/matchup/opening-study-panel.ts/html/spec.ts`, `matchup-right-column.ts/html/spec.ts`.

**Sources à extraire :** corps des cartes B dans `lead-pick.html`, panneau de backs et tris dans `opponent-leads.ts/html`. Les anciens composants restent temporairement en place jusqu’au raccordement de la tâche 6.

- [ ] Écrire le test d’accordéon : tous les leads repliés au départ ; clic L1 ouvre L1 ; clic L2 ferme L1 ; second clic L2 ferme tout. Même comportement par Entrée/Espace. Tri par `phaseACount` décroissant puis ID stable en cas d’égalité, sans muter les inputs.
- [ ] Utiliser un `<button type="button">` natif occupant tout l’en-tête, sans chevron. Deux lignes : libellé du lead + fréquence A, puis portraits. Ajouter `aria-expanded` et `aria-controls` vers un panneau identifié ; le contenu déplié reste **en dehors** du bouton.
- [ ] Dans l’en-tête cliquable, garder les portraits non interactifs (`showSetDetails=false`) pour éviter un élément focusable imbriqué. Ne pas réintroduire la mini-grille notre lead VS leur lead. Le curseur des boutons est déjà global dans le design-system.
- [ ] Gérer `expandedLeadId` dans la colonne droite : reset au changement de `contextKey`, fermeture si le lead disparaît ; aucune sélection automatique du premier lead. Conserver le choix au polling du même run, y compris lorsque l’utilisateur a tout replié.
- [ ] Relier chaque lead A à son `OpeningStudyDisplay` **par ID**, pas par index ; un quatrième lead hors top C doit avoir son contenu B. Après A/AC, afficher les messages d’attente dans les deux moitiés sans tableaux à zéro.
- [ ] Extraire T1 adverse principal/alternatives, notre recommandation/alternatives et cibles avec les formateurs actuels. Garder les deux distributions distinctes ; retirer le titre dupliqué et afficher les notes B une seule fois.
- [ ] Extraire à droite paires de backs et marginales du même lead. Conserver la présentation horizontale, les effectifs et pourcentages, avec retour à la ligne ou débordement local maîtrisé quand nécessaire. Garder l’explication des marginales non exclusives.
- [ ] Rendre le panneau en deux colonnes lorsque sa largeur le permet ; les empiler sur petit écran. Tester notes, données absentes, mêmes espèces dans les deux équipes et appariement ID malgré des ordres A/B différents.
- [ ] Vérifier les deux suites de composants. Après polling A→AC→ACB, le lead ouvert reste ouvert et reçoit ses données B sans changement de focus.

## Tâche 3 — Extraire les deux modales C et D

**Créer :** `src/app/features/matchup/refinement-scenarios-modal.ts/html/spec.ts`, `selection-detail-modal.ts/html/spec.ts`.

**Référence locale :** `shared/teams/team-import-dialog.ts/html` utilise déjà `<dialog>`/`showModal()` ; réutiliser ce mécanisme, pas son formulaire ni ses textes codés en dur. Aucun nouveau gestionnaire global de modales requis.

- [ ] Écrire les tests d’ouverture/fermeture et de contenu : D contient histogramme + T1 ; C contient comparaisons + limitations + règle. Prévoir un adaptateur de test pour `showModal`/`close` si jsdom ne les implémente pas ; la gestion réelle du focus sera testée dans Playwright.
- [ ] Implémenter `open(trigger)`/`close()` avec `<dialog>`, titre `<h2>` relié par `aria-labelledby`, bouton fermer nommé/traduit, fermeture Escape et restauration du focus au déclencheur encore connecté. Traiter aussi l’événement natif `close`, pas seulement le clic sur la croix.
- [ ] D : déplacer le contenu existant de `refinementScenarioBreakdown`, les limitations et `firstTurns`. Respecter `sampleSize=N` pour les scénarios, `firstTurnSampleSize=M` pour les T1, y compris M=0 et M<N. Ne pas copier ce contenu dans le résumé inline.
- [ ] C : présenter chaque comparaison avec son lead adverse, nos quatre/lead si disponibles dans `SelectionResult`, victoires/défaites/nuls, effectif et taux existant. Conserver la distinction entre candidats observés et meilleure sélection ; ne pas recalculer le classement métier. Afficher un état vide si aucune comparaison n’est disponible.
- [ ] Donner aux modales une hauteur maximale liée au viewport et un corps défilable, avec fermeture accessible sur mobile. Les panneaux sont dans la couche modale native, hors du clipping des colonnes.
- [ ] Tester M=0, liste longue, labels FR/EN, règle C absente et fermeture répétée sans exception. La colonne gauche fermera les modales lors d’un changement de run à la tâche 4.

## Tâche 4 — Construire la colonne gauche et empiler le gameplan

**Créer :** `src/app/features/matchup/matchup-left-column.ts/html/spec.ts`.

**Modifier :** `src/app/features/matchup/gameplan.ts/html` et créer `gameplan.spec.ts`.

- [ ] Écrire les tests progressifs : avant C, pas de quatre fictif ; après C, quatre visibles et bouton détails C ; avant D, pas de résumé ni bouton scénarios ; après D, W/L/nuls et `wins/sampleSize` corrects. Aucune observation T1 D ni comparaison C dans le contenu inline.
- [ ] Construire le bandeau horizontal interne : portraits lead puis backs, rings et tags ; résumé D compact ; boutons « Scénarios simulés » et « Détails de la sélection ». Autoriser le wrap sur largeur réduite, sans imposer une seule ligne à quatre portraits et deux boutons.
- [ ] Conserver une courte indication d’effectif/limite si utile ; les limitations complètes vont dans les modales. Les boutons d’ouverture sont des utilitaires `btn-neutral btn-soft`, distincts du bouton primaire d’analyse.
- [ ] Monter les deux modales avec leurs inputs et refs. Ouvrir l’une ferme l’autre. Sur changement de contexte ou disparition des données correspondantes, fermer immédiatement ; ne pas mettre à jour silencieusement une modal ouverte avec un autre run.
- [ ] Transformer `gameplan.html` en une pile : ouverture, milieu, fin, win condition. Conserver menaces/préservation/élimination/adaptations/limites dans un détail complémentaire en dessous afin de ne pas perdre le contenu actuellement disponible.
- [ ] Remplacer les textes de ce composant en `i18n` statique et « Pas encore calculé » codé en dur par les clés Transloco FR/EN. Réutiliser `GameplanReport` et `GameplanTab` ; pas de nouvelle génération ni faux contenu en attendant E.
- [ ] Tester un rapport complet en fixture pour le rendu vertical, et ACB/ACBD sans gameplan pour son état vide. Tester changement de run pendant une modal ouverte ; aucun contenu ni focus ne reste attaché à l’ancien run.

## Tâche 5 — Compacter la bande analyse et statut

**Modifier :** `src/app/features/matchup/analysis-controls.ts/html` ; créer `analysis-controls.spec.ts`.

- [ ] Ajouter l’input `runStatus` de type `RunStatusI18n | null`. Conserver start/cancel, `canStart`, `canCancel`, busy, clé d’idempotence et les outputs actuels.
- [ ] Retirer la carte bordée englobante et placer action, annulation, spinner/progression, hint et statut dans une seule bande `flex-wrap`. Afficher le helper utile dans cette même bande sans ajouter un bloc de statut séparé sous la page.
- [ ] Maintenir l’erreur de commande dans une zone pleine largeur immédiatement sous la bande. L’alerte d’incompatibilité reste au niveau `Matchup`, au même niveau visuel ; éviter le doublon de l’erreur via `commandError` et `error`.
- [ ] Conserver un libellé accessible pour la progression et ses valeurs ; signaler les états avec `role="status"` sans annonces dupliquées à chaque polling. Si le total est inconnu, ne pas inventer un pourcentage. Le spinner de lancement reste distinct de la progression du run.
- [ ] Tester un double clic durant le lancement (un appel), une erreur puis retry avec la clé existante, run actif et annulation, absence de capacités, état paused et texte de fin. Vérifier que les corps HTTP et la navigation `runId` sont identiques au comportement actuel.

## Tâche 6 — Raccorder la page et supprimer les anciens layouts

**Modifier :** `src/app/features/matchup/matchup.ts/html`, éventuellement `matchup.css`, `public/i18n/fr.json` et `en.json`. Créer `matchup.spec.ts`.

**Supprimer après migration des usages/tests :** `lead-pick.ts/html/css`, `opponent-leads.ts/html/css`, et le test `lead-pick.spec.ts` une fois ses assertions utiles transférées. Vérifier les références avant suppression ; ne pas supprimer les helpers de domaine partagés.

- [ ] Composer les trois bandes : équipes existantes ; `analysis-controls` avec statut intégré et alertes ; grille principale deux colonnes. Remplacer `showTabs()` par une disponibilité du contenu indépendante des onglets et de la présence du gameplan.
- [ ] Fournir les snapshots et sections du même `SelectedRunView` aux deux colonnes ; calculer `contextKey` depuis matchup/run sélectionné. Préserver `selectedRunView()` et ses gardes de run, le polling cinq secondes, la suspension quand le document est caché et les états chargement/erreur/incompatible.
- [ ] Supprimer `MatchupTab`, `activeTab`, `tabOrder`, `setTab`, `onTabKeydown` et l’effet de sélection automatique du premier lead. Le signal d’accordéon vit dans la colonne droite. Aucun rôle `tab`/`tabpanel` ni ancien ID `panel-*` ne doit rester sur cette page.
- [ ] Respecter la chaîne de hauteur : parent de route dans le shell existant, grille `min-h-0` occupant l’espace restant sur desktop, hôtes des colonnes flex/min-height adaptés, scroll indépendant gauche/droite. Ne pas ajouter un second `h-screen` ni masquer le bas du gameplan.
- [ ] Sur mobile, empiler gauche puis droite avec un défilement vertical de page accessible ; ne pas enfermer deux listes de hauteur nulle dans `overflow-hidden`. La grille interne des ouvertures s’empile également si trop étroite. Le bandeau d’équipes conserve son rendu actuel.
- [ ] Utiliser les conventions de page et tokens du design-system ; pas de nouvelle palette, de classes d’opacité texte `/60` ou `/80`, ni d’ajout local de curseur aux boutons. Ne pas étendre ce chantier à un nettoyage graphique de toute l’application.
- [ ] Ajouter les clés FR/EN pour titres, boutons de modales, progression et états vides. Retirer les anciennes clés d’onglets seulement après recherche des usages, y compris tests. Garder les labels métier encore utilisés dans les nouveaux composants.
- [ ] Tester le raccordement complet avec un store de test : A puis AC puis ACB puis ACBD sans remonter la page ; maintien du lead ouvert ; changement de run/matchup avec remise à zéro de l’état local ; réponse tardive de l’ancien run ignorée.

## Tâche 7 — Parcours navigateur, vérifications et recette

**Créer :** `e2e/matchup-single-page.spec.ts`, `docs/recette-matchup-single-page.md` à la racine du dépôt pour la recette (les E2E restent sous `pokecoach-angular/`).

**Modifier :** `e2e/fixtures/graphql-mock.ts`, au besoin `analysis-api-mock.ts`, `conditioned-openings.spec.ts`, `global-refinement.spec.ts`, `conditioned-openings-live.spec.ts`, `analysis-progressive-live.spec.ts`, `global-refinement-live.spec.ts`, `package.json` et le README.

- [ ] Préparer des fixtures UI cohérentes sans modifier les contrats : vide, A, AC, ACB, ACBD, rapport avec gameplan, puis erreurs/incompatibilité. Réutiliser les exemples Python validés pour les sections de simulation et les équipes/snapshots compatibles du mock GraphQL.
- [ ] Remplacer le test `conditioned-openings` ignoré par un vrai parcours de page ; conserver les tests de contrat `global-refinement` et ajouter un parcours visuel des modales. Ne pas considérer un test du parseur comme preuve de rendu.
- [ ] Vérifier l’absence de `tablist`, les trois bandes, les deux colonnes desktop, et l’accordéon strict sans chevron. Ouvrir/refermer au clavier et vérifier qu’un polling ne rouvre pas le panneau fermé.
- [ ] Ouvrir la modal D : histogramme et T1 visibles uniquement dans le dialog ; vérifier M=0/M<N. Ouvrir la modal C : comparaisons/limitations absentes de la vue principale mais présentes dans le dialog. Tester Escape, bouton fermer, Tab/Shift+Tab et retour du focus au déclencheur.
- [ ] Tester changement de contexte pendant une modal ouverte, redimensionnement mobile, contenu long, absence de débordement horizontal de page, et possibilité d’atteindre tout le gameplan et le dernier lead. Le focus ne doit pas entrer dans un panneau replié.
- [ ] Adapter les suites live qui cherchent encore les onglets : sélectionner un lead puis consulter ses deux panneaux, ouvrir les modales et recharger le run. Réutiliser leurs URLs/variables d’environnement et des runs déjà disponibles ; aucune création automatique d’une phase E requise par la recette.
- [ ] Ajouter un script `e2e:matchup-page` ciblant la nouvelle suite. Ne pas se contenter de `devbox run e2e`, qui ne lance actuellement que `coach.spec.ts`.
- [ ] Depuis `pokecoach2-angular`, exécuter `devbox run test`, `devbox run lint`, `devbox run build`. Depuis `pokecoach-angular` dans Devbox, exécuter `npm run e2e:matchup-page`, `npm run e2e:conditioned-openings`, `npm run e2e:global-refinement` et le parcours de création d’analyse existant.
- [ ] Faire la recette avec les vrais services quand disponibles : run ACB/ACBD, données dans les deux colonnes, scénarios en modal et persistance après refresh. Archiver les captures desktop/mobile clair/sombre et les résultats des checks dans la recette ; distinguer les tests mock des tests live non exécutés.

## Critères de fin

- La page n’a plus d’onglets : bandeau équipes, bande analyse/statut, contenu à deux colonnes.
- À gauche, notre quatre et D restent compacts ; les détails C et les scénarios/T1 D sont exclusivement dans leurs modales. Le gameplan est vertical et garde son état vide avant disponibilité.
- À droite, un seul lead peut être ouvert ; ses ouvertures B et ses backs sont réunis sans titre ni mini-grille VS dupliqués, et sans confondre observations A/B.
- L’affichage progressif, le contexte de run, le polling, les commandes Python et le contrat réseau restent corrects.
- Les parcours clavier/mobile fonctionnent, les textes sont traduits, les anciens layouts inutilisés sont supprimés et les tests navigateur couvrent réellement le rendu.

Ce document décrit la refonte frontend ; sa rédaction ne comprend aucune modification du code applicatif.
