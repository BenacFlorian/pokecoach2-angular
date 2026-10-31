import { test, expect } from '@playwright/test';
import {
  createMockGraphqlState,
  installGraphqlMock,
  SAMPLE_PASTE,
} from './fixtures/graphql-mock';

test.describe('parcours pokecoach', () => {
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
    const state = createMockGraphqlState();
    await installGraphqlMock(page, state);
  });

  test('accueil, équipe texte, adversaire, matchup sans analyse', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByText('Aucune équipe enregistrée')).toBeVisible();

    await page.getByRole('button', { name: 'Ajouter une équipe' }).click();
    await page.getByLabel('Nom').fill('Équipe E2E');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();

    await expect(page.getByRole('link', { name: /Équipe E2E/ })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('link', { name: /Équipe E2E/ }).click();
    await expect(page.getByText('Aucun adversaire préparé')).toBeVisible();

    await page.getByRole('button', { name: 'Préparer un match up' }).click();
    await page.getByLabel('Nom').fill('Adv URL');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();

    await expect(page.getByRole('link', { name: /Adv URL/ })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('link', { name: /Adv URL/ }).click();
    await expect(
      page.getByText('Matchup enregistré — aucune analyse disponible'),
    ).toBeVisible();
  });
});
