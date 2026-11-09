import { test, expect } from '@playwright/test';
import {
  createMockGraphqlState,
  installGraphqlMock,
  SAMPLE_PASTE,
} from './fixtures/graphql-mock';

test.describe('cycle de vie équipe', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'pokecoach.demo.v1',
        JSON.stringify({ schemaVersion: 1, teams: [], matchups: [] }),
      );
    });
    await page.route('https://pokeapi.co/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'pikachu',
          sprites: { front_default: '/images/pokemon-placeholder.svg' },
        }),
      });
    });
    await installGraphqlMock(page, createMockGraphqlState());
  });

  test('accueil → équipe → matchup → retour → suppression annulée', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Ajouter une équipe' }).click();
    await page.getByLabel('Nom').fill('Équipe A');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();
    await page.getByRole('link', { name: /Équipe A/ }).click();

    await page.getByRole('button', { name: 'Préparer un match up' }).click();
    await page.getByLabel('Nom').fill('Adv A');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page.getByRole('link', { name: /Adv A/ })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('link', { name: /Adv A/ }).click();
    await expect(page).toHaveURL(/\/matchups\//);

    await page.getByRole('link', { name: 'Mes équipes' }).click();
    await page.getByRole('button', { name: 'Supprimer' }).first().click();
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('link', { name: /Équipe A/ })).toBeVisible();
  });
});
