import { test, expect } from '@playwright/test';
import {
  createMockGraphqlState,
  installGraphqlMock,
  SAMPLE_PASTE,
} from './fixtures/graphql-mock';

test.describe('ajout matchup sans analyse automatique', () => {
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

  test('import adversaire puis navigation matchup sans appel python', async ({
    page,
  }) => {
    let pythonCalls = 0;
    await page.route('**/api-python/**', async (route) => {
      pythonCalls++;
      await route.fulfill({ status: 404, body: 'unexpected' });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Ajouter une équipe' }).click();
    await page.getByLabel('Nom').fill('Équipe E2E');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();
    await page.getByRole('link', { name: /Équipe E2E/ }).click();

    await page.getByRole('button', { name: 'Préparer un match up' }).click();
    await page.getByLabel('Nom').fill('Adv analysé');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();

    await expect(page).toHaveURL(/\/matchups\//, { timeout: 15_000 });
    await expect(
      page.getByText('Matchup enregistré — aucune analyse disponible'),
    ).toBeVisible();
    expect(pythonCalls).toBe(0);
  });
});
