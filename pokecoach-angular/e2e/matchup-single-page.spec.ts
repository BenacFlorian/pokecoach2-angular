import { test, expect } from '@playwright/test';
import {
  attachAcbRunToMatchup,
  E2E_ACB_RUN_ID,
} from './fixtures/acb-run-seed';
import {
  createMockGraphqlState,
  installGraphqlMock,
  SAMPLE_PASTE,
} from './fixtures/graphql-mock';
import { installAnalysisApiMock } from './fixtures/analysis-api-mock';

test.describe('page matchup single-page (mock)', () => {
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
    await installAnalysisApiMock(page, state);

    await page.goto('/');
    await page.getByRole('button', { name: 'Ajouter une équipe' }).click();
    await page.getByLabel('Nom').fill('Équipe single');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();
    await page.getByRole('link', { name: /Équipe single/ }).click();
    const teamId = page.url().split('/teams/')[1]?.split('/')[0] ?? '';
    await page.getByRole('button', { name: 'Préparer un match up' }).click();
    await page.getByLabel('Nom').fill('Adv single');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page).toHaveURL(/\/matchups\//, { timeout: 15_000 });
    const matchupId = state.matchups[0]?.id ?? '';
    attachAcbRunToMatchup(state, matchupId, E2E_ACB_RUN_ID);
    await page.goto(
      `/teams/${teamId}/matchups/${matchupId}?runId=${E2E_ACB_RUN_ID}`,
    );
  });

  test('sans tablist, colonnes et accordéon strict', async ({ page }) => {
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Leads adverses' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Détails de la sélection' })).toBeVisible();

    const leadButtons = page.locator('app-matchup-right-column button[type="button"]');
    await expect(leadButtons.first()).toBeVisible();
    await leadButtons.first().click();
    await expect(page.getByText('Tour 1 adverse possible')).toBeVisible();

    await page.getByRole('button', { name: 'Détails de la sélection' }).click();
    await expect(page.getByRole('heading', { name: 'Détails de la sélection (phase C)' })).toBeVisible();
    await page.getByRole('button', { name: 'Fermer' }).first().click();
  });
});
