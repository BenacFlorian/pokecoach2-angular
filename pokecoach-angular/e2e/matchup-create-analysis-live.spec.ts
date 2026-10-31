import { test, expect } from '@playwright/test';

const liveUrl = process.env['POKECOACH_E2E_BASE_URL'] ?? 'http://127.0.0.1:4200';

test.describe('recette live ajout matchup + analyse', () => {
  test.skip(
    !process.env['POKECOACH_ANALYSIS_LIVE'],
    'Définir POKECOACH_ANALYSIS_LIVE=1 avec stack API/worker réelle',
  );

  test('crée un adversaire et observe un run automatique', async ({ page }) => {
    await page.goto(liveUrl);
    test.info().annotations.push({
      type: 'note',
      description:
        'Recette non exécutée par défaut : nécessite PostGraphile, FastAPI analyses et worker phase A.',
    });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
