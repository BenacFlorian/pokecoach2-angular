import { test } from '@playwright/test';

/**
 * Parcours live : nécessite stack locale + ENABLE_DEMO_SEED=true sur api-python.
 * Exécution : npm run e2e:demo-live
 */
test.describe('demo seed live', () => {
  test.skip(
    !process.env.POKECOACH_E2E_DEMO_LIVE,
    'Set POKECOACH_E2E_DEMO_LIVE=1 with full stack running',
  );

  test('placeholder — enable when CI stack is wired', async () => {
    test.fixme(true, 'Wire stack-specific selectors after local verification');
  });
});
