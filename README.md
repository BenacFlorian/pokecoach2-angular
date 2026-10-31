# pokecoach2-angular

Frontend **pokecoach** (Angular) — socle Devbox + application dans `pokecoach-angular/`.

## Prérequis

- [Devbox](https://www.jetify.com/docs/devbox/installing_devbox/) (testé avec **0.17.3**)

## Environnement

| Outil | Version |
| --- | --- |
| Devbox | 0.17.3 |
| Node.js | 22.23.3 |
| npm | 10.9.9 |
| Angular CLI | 22.2.5 |
| Angular | 22.2.4 |

Vérification :

```bash
devbox run node --version
devbox run npm --version
```

## Commandes (depuis la racine de ce dépôt)

| Commande | Description |
| --- | --- |
| `devbox run setup` | `npm ci` dans `pokecoach-angular/` |
| `devbox run start` | Serveur de dev Angular |
| `devbox run build` | Build de production |
| `devbox run test` | Tests unitaires (sans watch) |

## Application

Code source : `pokecoach-angular/`. À `/`, la page affiche **Hello World**.

## Suite

Écrans métier, mocks et charte : [plan 2 — interface mock](./docs/plans/2026-10-31-02-angular-interface-mock.md).

Jalon d’initialisation : [plan 1](./docs/plans/2026-10-31-01-angular-initialisation.md).
