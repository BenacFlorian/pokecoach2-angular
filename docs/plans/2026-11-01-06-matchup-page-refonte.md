# Plan 06 — Refonte page détail matchup (single page)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les 3 onglets par une page unique à 3 bandes, même données `SimulationResultV2` / store existants.

**Architecture (recommandation retenue — approche 2):** `matchup.html` orchestrateur ; **`matchup-left-column`** (notre 4, affinage minimal, gameplan) ; **`matchup-right-column`** (liste leads A + accordéon) ; modales **`refinement-scenarios-modal`** et **`selection-detail-modal`** ; composant partagé **`opening-study-panel`** (grille 2 col dépliée) extrait de `lead-pick` + `opponent-leads`.

**Tech stack:** Angular standalone, Transloco, DaisyUI/Tailwind, `CoachStore` / `simulation-display.ts` inchangés côté données.

**Spec produit validée:** 2026-11-01 (échanges utilisateur + ajustements T1 D en modal, contenu déplié 2 colonnes).

---

## 1. Disposition globale

### Ligne 1 — Bandeau équipes

Identique à aujourd’hui : notre équipe (`app-team-strip`) | VS | équipe adverse.

### Ligne 2 — Analyse + progression

Une seule bande (`flex-wrap`, alignement vertical centré) :

- Bouton **Analyser le matchup** (+ annuler si run actif), spinner si lancement.
- **Barre de progression** et hint phase (existant `analysisProgressBar` / `progressHint`).
- **Message de fin / statut run** (`runStatusMessage`) sur la **même ligne** lorsque l’espace le permet ; sinon retour ligne sans bloc séparé sous la carte actuelle.

Sous la bande si nécessaire : alerte **incompatibilité moteur** (`incompatibleMessage`), erreurs analyse — pleine largeur.

Refactor **`analysis-controls`** : retirer la grosse carte bordure si le parent gère le layout ; exposer inputs pour fusion dans `matchup.html` ou wrapper `matchup-analysis-bar`.

### Ligne 3 — Contenu principal

Grille responsive :

- **`lg:grid-cols-2`**, gap cohérent avec le reste de l’app.
- Colonnes scrollables indépendamment (`min-h-0`, `overflow-y-auto`).
- Mobile : empiler **gauche puis droite**.

Affichage progressif :

- **Avant phase A publiée :** ligne 3 masquée ou message global « pas encore calculé » (aligné décision : droite vide + gauche sans 4 jusqu’à phase C).
- **Phase A sans B :** colonne droite liste leads ; dépliage sans contenu B ou message « ouvertures en cours ».
- **Phase C :** colonne gauche affiche notre 4.
- **Phase D :** stats minimales + modal scénarios.
- **Synthesis :** gameplan complet colonne gauche (bas).

---

## 2. Colonne gauche (`matchup-left-column`)

### 2.1 Bandeau sélection + affinage D (ligne 1 interne)

Layout **horizontal** :

| Zone | Contenu |
|------|---------|
| **Notre 4** | Portraits ordre lead puis backs, ring lead, tags lead/back — logique actuelle `lead-pick` / `displayFourSlots`. |
| **Affinage minimal** | Visible si `refinement` présent : résumé W/L/N, taux victoire (`wins/sampleSize`), **sans** `<details>` inline. Pas de limitations longues en inline (option : 1 ligne tronquée max). |
| **Actions** | Bouton **« Scénarios simulés »** → modal. Bouton **« Détails de la sélection »** → modal phase C. |

### 2.2 Modal affinage D (`refinement-scenarios-modal`)

Contenu :

1. Titre + rappel échantillonnage (texte i18n existant `refinementSamplingHint` / limitations courtes si utile).
2. **Histogramme** des scénarios simulés (lignes lead + back + count/N %) — contenu actuel du `<details>` `refinementScenarioBreakdown`.
3. **Premiers tours observés (phase D)** : section T1 globale D (`firstTurns`, dénominateur `firstTurnSampleSize`) — **déplacée ici**, pas dans la colonne gauche inline.

Ne pas afficher T1 D dans la bande minimale.

### 2.3 Modal sélection C (`selection-detail-modal`)

Contenu actuellement hors vue principale :

- Comparaisons / autres brings (`selections` / `leadPick.comparisons`).
- Limitations texte phase C, règle de sélection si présentes dans le modèle.
- Tableau ou liste des candidats observés si encore exposé ailleurs dans `lead-pick` — tout migrer ici.

### 2.4 Gameplan (ligne 2 interne)

Bloc vertical empilé (réutiliser **`app-gameplan-tab`** ou sections extraites) :

- Early game  
- Middle game  
- End game  
- Win condition  

État vide : message « pas encore calculé » tant que `gameplan` / `winCondition` absents (avant phase synthesis).

---

## 3. Colonne droite (`matchup-right-column`)

### 3.1 Liste des leads (phase A)

- Tri : fréquence preview décroissante (comme `sortedLeads()`).
- **Accordéon strict** : un seul `expandedLeadId` ; clic sur une ligne ferme les autres.
- **Pas de chevron** visible ; toute la carte repliée est cliquable (`cursor-pointer`, `role="button"`, `aria-expanded`).
- **État replié** (2 lignes) :
  - **L1 :** libellé type `Lead Aerodactyl Incineroar — 83.0 % au preview` (i18n + `formatOpponentLeadLabel` / percent phase A).
  - **L2 :** portraits des deux slots lead adverses.

### 3.2 État déplié — grille 2 colonnes

Composant **`opening-study-panel`** (ou équivalent) par lead :

| Colonne gauche (déplié) | Colonne droite (déplié) |
|------------------------|-------------------------|
| Contenu actuel **corps** de la carte ouvertures B dans `lead-pick.html` : T1 adverse (primary + alternatives), reco **notre** T1 (primary + alternatives), notes fin de tour B si présentes. **Sans** le `h4` dupliqué « Lead … — X % au preview » (déjà en en-tête replié). **Sans** la mini-grille our vs opp du `<summary>` actuel. | Contenu panneau **Opponent picks** pour **ce lead** : contexte backs, **paires de backs** (barre horizontale), **marginales** back, notes fin T1 phase A (`turn1EndObservations`) — logique et i18n de `opponent-leads.html` / `OpponentLeads` mappée par `opponentLeadId`. |

Données :

- Gauche : `OpeningStudyDisplay` / `openings.byOpponentLead` (phase B).
- Droite : entrée B `backPairs`, `backSlotMarginals`, etc. + champs A du lead si nécessaire — réutiliser mappers existants (`simulation-display`, `coach-mappers`).

Pending : message `openingsPending` / `backsPending` par lead ou global selon phase atteinte.

### 3.3 Suppressions

- Onglets et `activeTab` / navigation clavier tabs dans `matchup.ts`.
- Composant **`opponent-leads`** en layout 2 colonnes liste+détail : remplacé par liste accordéon.
- Section **`lead-pick`** en page entière : démantelée ; ne pas laisser de dead code.

---

## 4. Données & comportement

- **Aucun changement** contrat API / Python ; lecture inchangée via `CoachStore`, `SelectedRunView`, `buildTabDisplay` (renommer / simplifier si plus de tabs).
- **`selectedLeadId`** : remplacé par `expandedLeadId` sur la colonne droite (même sémantique pour scroll/focus optionnel).
- Polling analyse : inchangé.
- i18n : nouvelles clés boutons modales ; deprecate clés onglets si unused.

---

## 5. Accessibilité

- Ligne lead : `button` ou `div` avec `tabindex=0` + Enter/Espace ; `aria-expanded`.
- Modales : focus trap, fermeture Escape, titres `aria-labelledby`.
- Progression : conserver `role="progressbar"` / `role="status"`.

---

## 6. Tests & recette

- [ ] Mettre à jour / créer `matchup-left-column.spec.ts`, `matchup-right-column.spec.ts` (accordéon single-expand).
- [ ] Modales : ouverture fermeture + contenu T1 D dans modal scénarios.
- [ ] Adapter e2e (`conditioned-openings`, `global-refinement`) : plus de tabs, sélecteurs stables `data-testid` si besoin.
- [ ] `devbox run test`, `lint`, `build`.

---

## 7. Critères de fin

- Plus d’onglets sur la page matchup ; 3 bandes conformes au §1.
- Colonne gauche : 4 + D minimal + 2 modales + gameplan empilé.
- Colonne droite : liste leads A ; déplié = B (gauche) + backs/marginales (droite) ; un seul lead ouvert.
- T1 affinage D uniquement dans la modal scénarios (avec histogramme).
- Comparaisons / limitations C uniquement dans la modal sélection.

---

## 8. Références code actuel

| Actuel | Réutilisation |
|--------|----------------|
| `matchup.html` tabs | Remplacé par grille §1–3 |
| `lead-pick.html` gauche (4 + refinement) | Colonne gauche + modal D |
| `lead-pick.html` détail study | Colonne droite déplié **gauche** |
| `opponent-leads.html` panneau actif | Colonne droite déplié **droite** |
| `gameplan` | Colonne gauche bas |
| `analysis-controls.html` | Ligne 2 |
