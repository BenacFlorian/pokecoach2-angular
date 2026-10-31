import { test } from '@playwright/test';

const liveUrl = process.env['POKECOACH_E2E_LIVE_URL'];

test.describe('recette live PostGraphile', () => {
  test.skip(!liveUrl, 'Définir POKECOACH_E2E_LIVE_URL (ex. http://127.0.0.1:4200)');

  test('stack réelle — placeholder', async ({ page }) => {
    await page.goto(liveUrl!);
    await page.waitForTimeout(100);
  });
});
