# Recette — page matchup single-page

## Prérequis

- Stack locale : PostGraphile + API Python + worker (voir README du dépôt).
- Ou parcours **mock** Playwright (`npm run e2e:matchup-page` dans `pokecoach-angular/`).

## Vérifications manuelles (services réels)

1. Ouvrir un matchup avec run **ACB** ou **ACBD** publié.
2. Confirmer **absence d’onglets** : bandeau équipes, bande analyse, deux colonnes.
3. **Colonne gauche** : nos quatre après C ; résumé D compact après D ; boutons modales ; gameplan empilé après synthesis.
4. **Modal « Scénarios simulés »** : histogramme + T1 D uniquement dans le dialog.
5. **Modal « Détails de la sélection »** : comparaisons, limitations, règle C.
6. **Colonne droite** : un seul lead ouvert à la fois ; panneau = ouvertures (gauche) + backs (droite).
7. Recharger la page : le run sélectionné (`runId`) conserve les données visibles.

## Tests automatisés (mock)

```bash
cd pokecoach-angular
npm run e2e:matchup-page
npm run e2e:conditioned-openings
npm run e2e:global-refinement
```

## Captures

- Desktop clair/sombre : page complète ACBD + modales ouvertes.
- Mobile : colonnes empilées, scroll gameplan et dernier lead accessibles.
