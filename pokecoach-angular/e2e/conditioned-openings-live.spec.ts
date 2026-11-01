import { test, expect } from '@playwright/test';

test.describe('recette live ouvertures conditionnées', () => {
  test.skip(
    !process.env['POKECOACH_ANALYSIS_LIVE'],
    'Définir POKECOACH_ANALYSIS_LIVE=1 avec stack complète',
  );

  test('Lead & pick et Opponent Leads après B', async ({ page }) => {
    const runUrl = process.env['POKECOACH_CONDITIONED_OPENINGS_RUN_URL'];
    test.skip(!runUrl, 'POKECOACH_CONDITIONED_OPENINGS_RUN_URL requis (run ACB+)');
    await page.goto(runUrl!);
    await page.getByRole('tab', { name: /Lead/i }).click();
    await expect(page.getByText(/Notre tour 1 recommandé/i)).toBeVisible();
    await page.getByRole('tab', { name: /Opponent Leads/i }).click();
    await expect(page.getByText(/Actions conjointes/i)).toHaveCount(0);
    await expect(page.getByText(/Back observé face à notre sélection/i)).toBeVisible();
  });
});
