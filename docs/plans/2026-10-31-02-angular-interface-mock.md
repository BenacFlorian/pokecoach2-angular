# Plan 2 — Interface pokecoach avec données de matchup fictives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le parcours accueil → équipe → préparation d’un matchup, avec import d’équipes et trois onglets d’analyse alimentés par des données fictives.

**Architecture:** Application Angular standalone organisée par fonctionnalités, avec un état local à base de signals. Des services distincts isolent l’import Poképaste, le parsing Showdown, les images PokéAPI et les rapports fictifs. Les composants présentent des modèles frontend typés, sans dépendre d’un futur contrat Python.

**Tech Stack:** Angular et npm du plan 1, Angular Router, HttpClient, signals, Signal Forms si disponibles dans la version stable retenue, Tailwind CSS v4, daisyUI v5, tests Angular et Playwright pour les parcours essentiels.

**Spec:** [Vision métier](../../../synthese_projet_vgc_matchup_coach.md), [règles du projet](../../../agent.md), demande détaillée du 31 octobre 2026 retranscrite ci-dessous et correction utilisateur : **accepter les URL Poképaste ET le texte Showdown**. La préparation se fait **matchup par matchup**, sans lancement par lot.

**Prérequis :** [plan 1](./2026-10-31-01-angular-initialisation.md) terminé. **Statut :** plan à exécuter ultérieurement ; aucun code produit à ce stade.

## Contraintes globales et périmètre

- Nom de l’application : `pokecoach`, lien à gauche de la navbar menant à `/`.
- Accueil : liste de nos équipes, chacune nommée et affichant ses six Pokémon en ligne.
- Détail : bandeau de notre équipe, puis liste de ses matchups ; liste vide si aucun matchup n’a été préparé.
- Bouton `Préparer un match up` en haut à droite du détail ; modal avec nom et source d’équipe ; bouton `Valider`.
- Valider ajoute un seul adversaire à la liste de cette équipe et simule l’appel Python par un `console.log`. Cliquer sur l’adversaire ouvre sa préparation.
- Préparation : équipe adverse sur la première ligne, puis exactement `Opponent Leads`, `Lead & pick`, `Gameplan`.
- Toutes les statistiques, recommandations et synthèses stratégiques sont fictives. Mention visible `Données de démonstration` sur la préparation ; aucun Python, serveur applicatif, LLM ni LangGraph.
- Seuls l’import d’une URL Poképaste et la récupération des images PokéAPI font de vrais appels externes. Le parsing et le collage de texte sont locaux ; les tests interceptent les appels réseau.
- Appliquer les skills [angular-developer](../../../.agents/skills/angular-developer/SKILL.md) et [design-system](../../../.agents/skills/design-system/SKILL.md), notamment leurs références sur les formulaires, le routing, les images, la charte et l’accessibilité.
- Conserver les noms Pokémon/capacités du format Showdown. Interface en français, sauf les trois intitulés d’onglets demandés.

## Choix proposés pour compléter le parcours

Ces décisions sont des propositions du plan, pas des exigences ajoutées par l’utilisateur :

1. Un bouton `Ajouter une équipe` sur l’accueil réutilise le formulaire d’import pour enregistrer nos équipes ; la liste est aussi préremplie par quelques exemples locaux.
2. Une sauvegarde `localStorage` conserve équipes et matchups après rechargement. Pas de compte, de base de données, de synchronisation ou de gestion avancée des versions.
3. Les nouvelles équipes commencent avec zéro matchup. Une équipe de démonstration possède déjà un rapport complet pour explorer directement les onglets.
4. Le texte collé est conservé comme source Poképaste/Showdown locale, sans créer ni publier un paste sur un service externe. Une URL n’est présente que si l’import vient d’une URL.
5. Les onglets restent des états locaux de la page, sans routes supplémentaires. Une navigation vers un autre matchup réinitialise l’onglet et le lead sélectionnés.

L’état local avec services suffit pour ce POC. NgRx, un serveur mock distinct ou une architecture de plugins ajouteraient des composants sans besoin actuel. Des tableaux directement intégrés aux templates rendraient, eux, le futur remplacement des données plus difficile.

## Parcours et routes

| Route | Contenu | Interactions principales |
| --- | --- | --- |
| `/` | Nos équipes : nom, six Pokémon, accès à la source | Ajouter une équipe ; cliquer sur une ligne mène au détail |
| `/teams/:teamId` | Bandeau de notre équipe, action en haut à droite, liste de ses adversaires | Importer un adversaire ; cliquer sur un matchup mène à sa préparation |
| `/teams/:teamId/matchups/:matchupId` | Bandeau adverse puis les trois onglets | Choisir un onglet, sélectionner un lead adverse, revenir à notre équipe |
| route inconnue | Page introuvable avec lien vers l’accueil | Aucun chargement silencieux d’une autre équipe |

Vérifier que le matchup appartient au `teamId` de la route. Une URL invalide ou incohérente affiche un état explicite et un retour utile.

### Contenu précis des onglets

| Onglet | Données et présentation |
| --- | --- |
| `Opponent Leads` | Tous les leads adverses de l’échantillon, triés par fréquence décroissante ; deux portraits, occurrences, total et pourcentage. Le premier est sélectionné initialement. Au clic : actions conjointes du tour 1 le plus fréquent (capacités, cibles, switch, Téracristallisation si renseignée), fréquence correspondante, paire de back la plus fréquente et fréquence conditionnelle à ce lead. Un détail secondaire expose les autres actions, backs, fréquences individuelles du back et observations de fin du tour 1 disponibles. |
| `Lead & pick` | Nos quatre Pokémon sélectionnés, les deux du lead distingués des deux du back, justification, effectif et taux de victoire fictifs. Pour chacun des leads adverses étudiés : deux actions recommandées au tour 1, cibles, alternatives et adaptations. Présenter les compositions comparées et leurs effectifs en détail secondaire ; pour un lead non étudié, afficher « Non étudié dans cet exemple ». |
| `Gameplan` | Synthèse lisible : ouverture, milieu de partie, fin de partie, menaces classées, Pokémon à préserver/éliminer, adaptations, win condition expliquée. Quelques séquences fictives d’affinage et un rappel du faible échantillon complètent le plan, sans logs bruts. |

Les fréquences décrivent le jeu de données fictif et illustrent de futures observations du modèle, pas le comportement garanti de joueurs humains. Aucune donnée absente n’est convertie en zéro ou en recommandation inventée à l’affichage.

## Points de vigilance

| Condition | Résultat attendu | Tâche propriétaire |
| --- | --- | --- |
| Surnom, genre, forme et retours CRLF dans le paste | Les six espèces sont identifiées sans confondre surnom et espèce | 2 |
| URL inaccessible, source changée pendant un import | Erreur utile, aucun ajout partiel ni résultat ancien utilisé | 2 et 6 |
| Forme inconnue, image absente ou PokéAPI hors ligne | Nom conservé, placeholder, navigation toujours possible | 3 |
| Double validation, rechargement, stockage indisponible | Un seul ajout par soumission ; restauration ou avertissement explicite | 4 et 6 |
| Rapport rattaché à une autre équipe, sélection d’un nouveau lead | Pas de mélange de données entre équipes, matchups ou panneaux | 4, 7 et 8 |

## Organisation des fichiers

Tous les chemins ci-dessous sont relatifs à `pokecoach-angular/`. Les composants ont un fichier `.ts` et un `.html` de même nom ; ajouter un `.css` local seulement si les utilitaires et styles globaux ne suffisent pas. Les services sont des classes injectables, même si leur nom moderne n’a pas le suffixe `Service`. Générer composants et services avec le CLI local puis ajuster la structure.

| Fichiers | Responsabilité |
| --- | --- |
| `.postcssrc.json`, `src/styles.css`, `src/styles/daisyui.css`, `eslint.config.js` | Tailwind/daisyUI, tokens, styles globaux et lint accessible |
| `src/app/app.{ts,html}`, `app.config.ts`, `app.routes.ts` | Shell, providers, routing |
| `src/app/shared/layout/navbar.{ts,html}` | Lien `pokecoach` vers `/` |
| `src/app/shared/pokemon/pokemon-portrait.{ts,html}` | Image, nom, chargement, fallback |
| `src/app/shared/teams/team-strip.{ts,html}` | Nom et rangée des six Pokémon, sans comportement de navigation imposé |
| `src/app/shared/teams/team-import-dialog.{ts,html}` | Modal commune « nom + URL ou texte » |
| `src/app/core/models/team.model.ts`, `matchup.model.ts` | Modèles et invariants frontend |
| `src/app/core/import/pokepaste-parser.ts`, `pokepaste-client.ts`, `team-import.ts` | Parsing pur, lecture distante, orchestration de l’import |
| `src/app/core/pokemon/pokemon-images.ts`, `pokemon-aliases.ts` | Accès PokéAPI, cache et correspondances de noms/formes |
| `src/app/core/data/demo-teams.ts`, `demo-reports.ts` | Fixtures séparées des vues, texte Showdown et rapports reproductibles |
| `src/app/core/data/coach-storage.ts`, `coach-store.ts`, `mock-matchup-preparation.ts` | Persistance, état applicatif, simulation de préparation |
| `src/app/features/home/home.{ts,html}` | Liste et ajout de nos équipes ; remplace Hello World |
| `src/app/features/team-detail/team-detail.{ts,html}` | Bandeau et liste de matchups |
| `src/app/features/matchup/matchup.{ts,html}` | Bandeau adverse, trois onglets, état de sélection |
| `src/app/features/matchup/opponent-leads.{ts,html}` | Leads, actions et backs conditionnels |
| `src/app/features/matchup/lead-pick.{ts,html}` | Nos quatre, notre lead et les tours 1 recommandés |
| `src/app/features/matchup/gameplan.{ts,html}` | Synthèse stratégique structurée |
| `src/app/shared/not-found/not-found.{ts,html}` | URL/ressource introuvable et retour |
| `src/app/features/developer/design-system.{ts,html}` | Aperçu minimal de la charte, en développement seulement |
| `public/images/pokemon-placeholder.svg` | Fallback local sans dépendance réseau |
| `playwright.config.ts`, `e2e/coach.spec.ts`, `e2e/fixtures/` | Parcours navigateur et réponses réseau de test |

Ajouter les `.spec.ts` à côté des services et composants testés dans les tâches suivantes. Ne pas créer des abstractions générales sans consommateur.

## Tâche 1 — Installer le socle visuel et le shell

**Fichiers :** styles, configuration PostCSS/lint, `app.*`, `navbar.*`, `features/developer/design-system.*`, `package.json`, `package-lock.json`.

**Interfaces :** `Navbar` affiche le lien `/` ; `app.html` définit une seule fois le fond et les espacements de page ; les composants utilisent les classes préfixées `tw:` du skill.

- [ ] Relire les références du design system. Les mentions de services, de thèmes, de lint ou de route développeur « déjà présents » concernent l’application d’origine du skill : rien de tout cela n’existe encore ici.
- [ ] Installer les versions compatibles de Tailwind v4, `@tailwindcss/postcss`, PostCSS et daisyUI v5 via npm, sans `--force`. Configurer PostCSS et `@import "tailwindcss" prefix(tw)` ; vérifier que les classes daisyUI reçoivent bien le préfixe attendu, sans double préfixage. Suivre les [instructions Angular/daisyUI](https://daisyui.com/docs/install/angular/) et la [configuration daisyUI](https://daisyui.com/docs/config/).
- [ ] Créer les thèmes clair/sombre dans `src/styles/daisyui.css`, en partant de palettes daisyUI et en réglant les tokens centraux : surfaces `base-100/200/300`, rayons, `--depth: 0`, `--noise: 0`, couleurs sémantiques et `primary-soft`. Aucun code couleur local dans les pages. Le choix de palette reste un choix visuel d’implémentation à vérifier dans les deux thèmes.
- [ ] Définir globalement les styles `h1/h2/h3`, le curseur des contrôles et le focus visible. Utiliser les niveaux de boutons et surfaces décrits par le skill ; installer localement Material Symbols si des icônes de cette famille sont utilisées.
- [ ] Préparer l’i18n Angular avec `@angular/localize` compatible : identifiants `@@...` pour textes/attributs et `$localize` pour messages TypeScript. Une seule langue affichée ; aucun sélecteur de langue nécessaire. Les trois onglets gardent leur texte demandé. Voir la [préparation i18n officielle](https://angular.dev/guide/i18n/prepare).
- [ ] Installer/configurer `angular-eslint` compatible et les règles d’accessibilité des templates au niveau erreur. Fournir `npm run lint` puis `devbox run lint` à la racine ; le build Angular seul ne lance pas ce lint.
- [ ] Créer la navbar, le shell commun et les zones de défilement. Les pages utilisent `tw:h-full tw:flex tw:flex-col tw:gap-4 tw:pt-4` sans répéter le fond ni les marges du shell. Avec un shell à hauteur contrainte, donner une vraie zone `min-h-0` défilable au contenu pour éviter de couper les rapports longs.
- [ ] Ajouter `/developer/design-system` seulement en développement pour vérifier boutons, surfaces, textes, états et focus en clair/sombre. Ne pas reproduire l’outillage avancé de l’application source ; mesurer les contrastes avec les outils navigateur lors de la recette.
- [ ] Vérifier `devbox run lint` et `devbox run build`, puis les deux thèmes à l’écran. La route développeur ne doit pas être accessible dans le build de production.

**Livrable :** shell navigable et règles graphiques disponibles avant les composants métier.

## Tâche 2 — Modéliser les équipes et isoler l’import Poképaste

**Fichiers :** `team.model.ts`, `pokepaste-parser.ts`, `pokepaste-client.ts`, `team-import.ts`, leurs `.spec.ts`, fixtures de paste.

**Interfaces à définir :**

- `TeamInput = { kind: 'url'; value: string } | { kind: 'text'; value: string }`.
- `PokemonSet` : `slot` (0 à 5), `species`, `nickname?`, `gender?`, `item?`, `ability?`, `level?`, `teraType?`, `nature?`, `evs?`, `ivs?`, `moves: string[]`, `rawBlock`.
- `ImportedTeam` : `source: { kind; rawText; url? }`, tuple de six `PokemonSet`, avertissements de parsing.
- `Team` : `id`, `name`, `source`, les six Pokémon, `createdAt`. Les surnoms ne servent jamais à interroger PokéAPI.
- `PokepasteParser.parse(rawText: string): ParseResult` : résultat discriminé succès/erreurs localisées, sans réseau ni état global. Un succès produit les six Pokémon et les avertissements.
- `PokepasteClient.fetchText(url: string): Observable<string>` : normalise une URL Poképaste et récupère le texte distant.
- `TeamImport.resolve(input: TeamInput): Observable<ImportedTeam>` : récupère si nécessaire puis appelle le même parser ; erreurs typées convertibles en messages d’interface.

- [ ] Écrire les tests du parser avant son implémentation : LF/CRLF, lignes vides, `Surnom (Espèce) (M) @ Objet`, espèce sans surnom, noms avec tirets/espaces, absence d’objet, capacités, Tera Type, EV/IV. Vérifier `species === 'Incineroar'` pour `Chat (Incineroar) (M) @ Sitrus Berry`.
- [ ] Tester le rejet d’une source vide, d’une page HTML et d’une équipe de cinq ou sept Pokémon. Les six blocs doivent être reconnus ; les erreurs citent le bloc concerné. Une ligne optionnelle inconnue devient un avertissement conservé, pas une espèce fictive.
- [ ] Implémenter le parser, sans validation compétitive complète ni vérification d’une réglementation. Conserver les champs absents comme absents, sans inventer de capacités ou d’objets.
- [ ] Tester le client avec `HttpTestingController` : URL `https://pokepast.es/<id>` normalisée vers `/raw`, variante déjà terminée par `/raw` ou `/json` normalisée, mauvais domaine/protocole refusé, 404 et erreur réseau propagées. Ne pas accepter une URL arbitraire comme source.
- [ ] Implémenter le client et l’orchestrateur. Le [serveur Poképaste publié](https://raw.githubusercontent.com/felixphew/pokepaste/v3/server.go) expose `/raw` et `/json` avec CORS ; vérifier le comportement du service hébergé lors de l’exécution. Prévoir timeout et annulation sans ajouter de proxy backend.
- [ ] Tester que l’entrée texte ne provoque aucun HTTP et que texte collé et URL renvoyant le même texte produisent les mêmes Pokémon. Une erreur d’import ne produit aucune équipe partielle.
- [ ] Exécuter les tests ciblés via le runner du projet, puis `devbox run build`.

**Livrable :** import commun aux équipes personnelles et adverses, avec source conservée ; pas de publication automatique sur Poképaste.

## Tâche 3 — Images Pokémon et rangée d’équipe

**Fichiers :** `pokemon-images.ts`, `pokemon-aliases.ts`, `pokemon-portrait.*`, `team-strip.*`, placeholder et tests associés.

**Interfaces :** `PokemonImages.getImage(species: string): Observable<PokemonImage>` ; `PokemonImage` expose `url`, `alt` et `isFallback`. `PokemonPortrait` reçoit un `PokemonSet`. `TeamStrip` reçoit une `Team` et présente son nom et les six Pokémon.

- [ ] Tester la correspondance des espèces des fixtures et des formes courantes ; centraliser les alias (par exemple Showdown → identifiant PokéAPI) et les différences de forme par défaut, plutôt que disperser des `replace()` dans les composants.
- [ ] Interroger `/api/v2/pokemon/{name-or-id}` et utiliser l’URL renvoyée dans `sprites` : illustration officielle si présente, sinon sprite standard, sinon placeholder local. Ne pas construire une URL d’image depuis un numéro supposé. La [documentation PokéAPI](https://pokeapi.co/docs/v2) décrit les ressources et demande leur mise en cache.
- [ ] Tester le cache et la mutualisation de deux requêtes simultanées pour la même espèce, les réponses sans sprite, les 404 et les erreurs réseau. Prévoir une nouvelle tentative possible après échec, sans boucle ni cache permanent d’une erreur transitoire.
- [ ] Implémenter le portrait avec dimensions réservées, chargement discret, nom accessible et gestion d’un échec de chargement de l’image elle-même. Une espèce inconnue reste lisible et ne bloque pas l’import.
- [ ] Afficher les six Pokémon dans l’ordre source sur **une seule ligne** ; sur petit écran, autoriser le défilement horizontal local si nécessaire, sans faire déborder toute la page.
- [ ] Garder `TeamStrip` présentatif : les parents choisissent un lien de navigation ou un bandeau statique. Aucun lien externe Poképaste imbriqué dans un lien de ligne cliquable.
- [ ] Vérifier les tests, le build et le rendu avec réseau coupé.

## Tâche 4 — État local et préparation fictive cohérente

**Fichiers :** `matchup.model.ts`, `demo-teams.ts`, `demo-reports.ts`, `coach-store.ts`, `coach-storage.ts`, `mock-matchup-preparation.ts` et leurs tests.

**Modèles et interfaces :**

- `PokemonRef = { side: 'ours' | 'opponent'; slot: 0 | 1 | 2 | 3 | 4 | 5 }`. Les références restent relatives aux deux équipes du matchup.
- `BattleAction` distingue une capacité (`actor`, `move`, `targets`, `terastallize?`) et un changement (`actor`, `switchTo`). Les cibles distinguent un Pokémon et une zone (`self`, `all-opponents`, `field`) ; pas de cible inventée pour une action sans cible individuelle.
- `Frequency<T> = { value: T; count: number; sampleSize: number }` ; calculer les pourcentages à partir des effectifs, pas de valeurs dupliquées.
- `OpponentLeadStats` : `id`, paire de slots adverses, effectif phase A, séries de deux actions phase B, paires de back, fréquences marginales des Pokémon du back, observations de fin du tour 1.
- `SelectionResult` : lead adverse étudié, nos quatre slots, notre paire de lead, victoires/défaites/nuls et effectif. Le taux de victoire est `wins / sampleSize`, avec un état absent si l’effectif est nul.
- `LeadRecommendation` : nos quatre, notre lead, justification, références aux `SelectionResult`, deux actions et alternatives par lead adverse étudié.
- `Gameplan` : étapes, menaces ordonnées, Pokémon à préserver/éliminer, adaptations, win condition et séquences d’affinage.
- `MatchupReport` : `source: 'mock'`, `fixtureVersion`, paramètres/effectifs A–D, leads adverses, comparaisons de sélections, recommandation et gameplan. Aucun faux identifiant de checkpoint ou de version Python.
- `PreparedMatchup` : `id`, `teamId`, `opponent: Team`, `report`, `createdAt`.
- `CoachStore` expose des signals en lecture seule pour équipes et matchups, `addTeam(name: string, imported: ImportedTeam): Team`, `getTeam(id: string): Team | undefined`, `matchupsFor(teamId: string): PreparedMatchup[]`, `getMatchup(teamId: string, matchupId: string): PreparedMatchup | undefined`, `addMatchup(matchup: PreparedMatchup): void`.
- `CoachStorage.load(): StorageResult`, `save(snapshot: CoachSnapshot): StorageResult`, où le snapshot contient `schemaVersion: 1`, équipes et matchups. `StorageResult` distingue succès, absence et erreur exploitable par l’interface.
- `MockMatchupPreparation.prepare(ours: Team, opponent: Team): Observable<PreparedMatchup>` : exactement un log `[mock] prepare-matchup` avec les deux équipes, courte attente fixe annulable (par exemple 400 ms), puis un rapport local. Aucun HTTP vers Python.

- [ ] Créer des fixtures comportant plusieurs équipes de six, dont une sans matchup et une avec un rapport complet. Toutes leurs sources Showdown sont locales et passent par le parser ; ne pas dépendre d’URL distantes pour démarrer la démonstration.
- [ ] Construire les rapports depuis les slots des équipes réellement importées. Les exemples de capacités viennent de leurs listes ; si une information manque, l’indiquer. Ne pas attacher un rapport nommé sur d’autres espèces à une équipe arbitraire.
- [ ] Prévoir un exemple déterministe : phase A = 1 000 observations, quatre leads à 420/270/180/130 ; phase B = 50 observations par lead ; phase C = 50 parties par lead pour les trois premiers, réparties entre les compositions comparées ; phase D = 10 parties d’affinage. Ces nombres sont des fixtures, aucun combat n’est exécuté.
- [ ] Tester les invariants : somme des effectifs A = 1 000 ; distributions conjointes actions/backs B = 50 pour chaque lead ; back disjoint du lead ; quatre Pokémon distincts ; notre lead inclus dans nos quatre ; résultats C par lead totalisant 50 ; `wins + losses + draws = sampleSize`. Les fréquences individuelles de présence au back ne doivent pas être artificiellement normalisées à 100 % : deux Pokémon sont présents.
- [ ] Implémenter le store, l’initialisation des données de démo une seule fois et la persistance sous `pokecoach.demo.v1`. Valider la structure et les références à la lecture avant de les accepter.
- [ ] Tester un aller-retour de sauvegarde, un JSON corrompu, une version inconnue et une exception du stockage. En cas d’échec, garder un fonctionnement en mémoire et afficher un message indiquant que les changements ne sont pas sauvegardés ; ne pas écraser silencieusement une sauvegarde incompatible.
- [ ] Tester que `prepare()` produit un seul log par préparation, un rapport appartenant aux bonnes équipes et aucune requête backend. Ajouter le résultat au store seulement après succès ; l’annulation avant succès n’ajoute rien.
- [ ] Exécuter les tests ciblés et le build. Documenter les fixtures comme artificielles, y compris leurs textes stratégiques, sans validation de win condition.

## Tâche 5 — Construire l’accueil et le formulaire d’import commun

**Fichiers :** `features/home/home.*`, `shared/teams/team-import-dialog.*`, routes et tests.

**Interfaces :** `TeamImportDialog` reçoit le contexte `'own-team' | 'opponent'`, émet une soumission `{ name: string; imported: ImportedTeam }` et une annulation. Le parent pilote l’état de préparation après l’import. Utiliser `TeamImport.resolve()` et `CoachStore.addTeam()`.

- [ ] Remplacer Hello World par la liste de nos équipes. Chaque ligne comporte le nom, les six portraits et un vrai lien vers `/teams/:teamId`, utilisable au clavier.
- [ ] Ajouter `Ajouter une équipe`. La modal contient un champ nom, un choix exclusif `URL Poképaste` / `Texte Showdown`, le champ correspondant, `Valider` et `Annuler`. Le nom est obligatoire et normalisé par `trim()` ; seule la source du mode actif est validée.
- [ ] Utiliser les formulaires signals pour une version stable compatible, sinon les Reactive Forms du projet. Le submit est bloqué pendant la résolution ; aucun double import ni double ajout.
- [ ] Afficher erreurs de champs et import en langage utilisateur, avec une action utile. Pour une URL inaccessible : proposer de vérifier le lien ou de passer au texte collé ; ne pas remplacer silencieusement l’équipe par un exemple.
- [ ] À la réussite, ajouter notre équipe avec zéro matchup, fermer la modal et rester sur l’accueil. Conserver sa source ; afficher un lien « Voir le Poképaste » si URL, sinon permettre de consulter le texte conservé.
- [ ] Implémenter la modal avec `<dialog>`, titre `<h2>` lié par `aria-labelledby`, focus initial, Escape, confinement du focus et retour au déclencheur. Une fermeture ou un changement de source annule la résolution en cours, sans ajout tardif.
- [ ] Tester texte valide, URL valide mockée, nom vide, paste invalide, changement de mode pendant une requête, annulation et double soumission. Vérifier que l’ajout d’une équipe personnelle ne logue pas de préparation Python.
- [ ] Vérifier lint, build et clavier. L’accueil vide affiche un message et l’action d’ajout, jamais un écran inutilisable.

## Tâche 6 — Détail d’équipe et préparation d’un matchup

**Fichiers :** `features/team-detail/team-detail.*`, `team-import-dialog.*`, `app.routes.ts` et tests.

**Interfaces :** consommer `getTeam()`, `matchupsFor()`, `MockMatchupPreparation.prepare()` et `addMatchup()` ; réutiliser la modal en contexte `'opponent'`.

- [ ] Lire `teamId`, afficher notre équipe dans le bandeau immédiatement sous la navbar, puis seulement les matchups qui lui appartiennent.
- [ ] Placer `Préparer un match up` en haut à droite du contenu. Avec zéro matchup, conserver le bandeau et un état vide discret ; ne pas générer automatiquement d’adversaires ni de résultats.
- [ ] À `Valider`, résoudre la source puis lancer la préparation fictive. Pendant l’attente, désactiver le submit et afficher `Préparation de démonstration…` ; l’annulation avant succès n’insère aucun résultat.
- [ ] Après succès, ajouter exactement un matchup, fermer la modal, mettre à jour la liste et rester sur le détail. La ligne adverse affiche son nom et ses six Pokémon ; son lien ouvre la préparation. Pas d’ouverture automatique qui court-circuiterait le parcours demandé.
- [ ] En cas d’erreur, conserver la saisie et donner une possibilité de réessayer. Si `teamId` change ou si la page est détruite pendant la préparation, annuler la souscription et empêcher un ajout dans la nouvelle équipe.
- [ ] Tester avec espion du log et du store : une validation → un log → un matchup ; double clic → un seul ajout ; équipe B inchangée ; annulation → zéro ajout. Tester l’accès à une équipe inexistante et le rechargement après ajout.
- [ ] Vérifier lint, tests et build, puis parcourir manuellement une équipe vide jusqu’à l’ouverture de son premier matchup.

## Tâche 7 — Page de préparation et onglet Opponent Leads

**Fichiers :** `features/matchup/matchup.*`, `opponent-leads.*`, `shared/not-found/not-found.*`, routes et tests.

**Interfaces :** `Matchup` résout `PreparedMatchup` avec les deux identifiants de route. `OpponentLeads` reçoit les deux équipes et `OpponentLeadStats[]` ; `selectedLeadId` reste un état local réinitialisé lorsque le matchup change.

- [ ] Afficher d’abord le bandeau adverse, puis le badge de démonstration et les trois onglets dans l’ordre demandé. Ajouter un retour vers notre équipe sans transformer la navbar simple en menu complexe.
- [ ] Implémenter les tabs avec rôles, `aria-selected`, panneaux reliés, navigation fléchée/Home/End et focus cohérent. `Opponent Leads` est actif à l’ouverture.
- [ ] Trier les leads par fréquence décroissante, avec un ordre stable en cas d’égalité. Afficher numérateur, dénominateur et pourcentage ; zéro échantillon donne « Données indisponibles ».
- [ ] Sélectionner le premier lead disponible. Au clic, remplacer les détails par **ceux de ce lead** : actions conjointes les plus fréquentes, cibles/changements et paire de back la plus probable. Les fréquences de B ont leur dénominateur B, pas les 1 000 observations A.
- [ ] Proposer un détail secondaire pour les distributions restantes et observations de fin du tour 1. Les égalités sont visibles ; ne pas présenter un choix arbitraire comme seul résultat possible.
- [ ] Tester un tableau non trié, la sélection d’un autre lead, des statistiques absentes, une paire à égalité et un changement de route réutilisant le composant. Vérifier les slots affichés et leurs appartenances aux équipes.
- [ ] Tester un `matchupId` appartenant à une autre équipe : message introuvable, jamais affichage de ses données. Vérifier tests, lint et build.

## Tâche 8 — Onglets Lead & pick et Gameplan

**Fichiers :** `lead-pick.*`, `gameplan.*`, `matchup.*` et tests.

**Interfaces :** `LeadPick` reçoit les équipes, `LeadRecommendation` et `SelectionResult[]`. `Gameplan` reçoit les équipes, le `Gameplan` du rapport et les effectifs d’affinage.

- [ ] Afficher les quatre Pokémon recommandés, avec une séparation explicite entre les deux du lead et les deux du back. Fournir la justification et le taux de victoire avec son effectif et la mention de démonstration.
- [ ] Associer les deux actions du tour 1 et leurs alternatives au lead adverse correspondant. Afficher capacités, cibles, changements et Téracristallisation quand présents ; indiquer l’absence d’étude pour les autres leads.
- [ ] Afficher les compositions comparées dans un détail secondaire, avec leurs effectifs propres. Ne pas attribuer les 50 parties d’un lead à chacune des compositions ni conclure à une supériorité statistique prouvée.
- [ ] Présenter la synthèse en sections lisibles : déroulement, menaces prioritaires, ressources à préserver, cibles à éliminer, adaptations et win condition. Inclure les quelques séquences D et leurs limites, sans journaux bruts.
- [ ] Utiliser du texte structuré rendu par interpolation Angular ; ne pas injecter du HTML arbitraire provenant d’un paste ou d’un futur LLM.
- [ ] Tester que les quatre et le lead correspondent au rapport, que chaque conseil T1 référence le bon lead adverse et que chaque section du gameplan apparaît. Tester l’absence d’une recommandation sans fabriquer de remplacement.
- [ ] Vérifier l’absence de débordement avec noms longs et paragraphes longs, puis tests, lint et build.

## Tâche 9 — Recette du parcours complet et documentation

**Fichiers :** `playwright.config.ts`, `e2e/coach.spec.ts`, `e2e/fixtures/`, scripts npm/Devbox, `README.md` racine.

- [ ] Installer/configurer Playwright et exposer `npm run e2e` puis `devbox run e2e`. Utiliser un contexte navigateur neuf par scénario, un stockage maîtrisé et des réponses Poképaste/PokéAPI interceptées ; aucun test ne dépend de leurs disponibilités réelles.
- [ ] Automatiser le scénario principal : accueil → ajouter notre équipe par texte → détail vide → ajouter un adversaire par URL → un seul log fictif → liste enrichie → préparation → choix d’un autre lead → deux autres onglets → retour accueil par `pokecoach`.
- [ ] Automatiser le parcours inverse de source (notre équipe par URL, adversaire par texte), le rechargement avec conservation du matchup, une erreur d’import et le fallback image. Vérifier qu’aucun appel Python n’est émis.
- [ ] Vérifier au clavier la modal, Escape/retour du focus, les liens de lignes et les tabs. Réaliser la recette à 390 px et 1440 px, en clair et sombre : six Pokémon en ligne, défilement local si nécessaire, bouton d’ajout accessible, rapports longs lisibles.
- [ ] Mesurer les contrastes AA sur les surfaces utilisées et appliquer les contrôles du skill design-system sur les templates touchés. Les messages utilisateur et noms accessibles possèdent des identifiants i18n ; aucun message technique brut n’est affiché.
- [ ] Exécuter `devbox run lint`, `devbox run test`, `devbox run build` et `devbox run e2e`. Attendu : sorties sans erreurs ; consigner tout contrôle non réalisable plutôt que le déclarer réussi.
- [ ] Faire un test manuel réel d’URL Poképaste et de PokéAPI pour compléter les tests interceptés. Une panne externe doit conduire aux états d’erreur prévus ; ne pas la masquer en succès de recette réseau.
- [ ] Documenter les commandes, les routes, la sauvegarde locale, les fixtures, les deux modes d’import et les frontières des services à remplacer plus tard. Rappeler que les imports/images sont réels et les analyses fictives.

## Critères de fin

- Les trois pages et leurs liens fonctionnent, y compris après rechargement.
- Nos équipes et les équipes adverses sont importables par **URL ou texte**, avec parsing isolé.
- Une nouvelle équipe n’a aucun matchup ; chaque validation en prépare exactement un.
- Les portraits proviennent du service PokéAPI avec cache et fallback.
- Les trois onglets exposent toutes les informations métier prévues, dont actions/cibles, backs, sélection, résultats, plan global et win condition.
- Les données fictives sont cohérentes avec les Pokémon affichés et clairement identifiées.
- La charte, le clavier, le responsive et les erreurs ont été vérifiés.
- Aucune analyse réelle, aucun traitement Python et aucun appel LLM n’ont été ajoutés.
