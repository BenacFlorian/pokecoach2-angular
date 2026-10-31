import { test, expect } from '@playwright/test';

const liveUrl = process.env['POKECOACH_E2E_BASE_URL'] ?? 'http://127.0.0.1:4200';

test.describe('recette live analyse progressive phase A', () => {
  test.skip(
    !process.env['POKECOACH_ANALYSIS_LIVE'],
    'Définir POKECOACH_ANALYSIS_LIVE=1 avec stack complète',
  );

  test('affiche opponent leads après pause A', async ({ page }) => {
    const runUrl = process.env['POKECOACH_ANALYSIS_RUN_URL'];
    test.skip(!runUrl, 'POKECOACH_ANALYSIS_RUN_URL requis (URL avec runId)');
    await page.goto(runUrl!);
    await expect(page.getByRole('tab', { name: /Opponent Leads/i })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tab', { name: /Opponent Leads/i })).toBeVisible();
  });
});
