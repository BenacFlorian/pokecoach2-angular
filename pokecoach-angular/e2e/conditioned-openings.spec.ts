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

test.describe('ouvertures conditionnées (mock GraphQL)', () => {
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
    await page.getByLabel('Nom').fill('Équipe ouvertures');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();
    await page.getByRole('link', { name: /Équipe ouvertures/ }).click();
    const teamId = page.url().split('/teams/')[1]?.split('/')[0] ?? '';
    await page.getByRole('button', { name: 'Préparer un match up' }).click();
    await page.getByLabel('Nom').fill('Adv ouvertures');
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

  test('affiche ouvertures B et backs après ouverture du lead', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Leads adverses' })).toBeVisible({
      timeout: 15_000,
    });
    const leadButtons = page.locator('app-matchup-right-column button[type="button"]');
    await leadButtons.first().click();
    await expect(page.getByText('Paires de back')).toBeVisible();
    await expect(page.getByText('Notre tour 1 recommandé')).toBeVisible();
  });
});
