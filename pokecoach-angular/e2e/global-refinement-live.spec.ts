import { test } from '@playwright/test';

test.describe('évaluation globale phase D (live)', () => {
  test('placeholder — exiger POKECOACH_GLOBAL_REFINEMENT_RUN_URL', async () => {
    test.skip(
      !process.env['POKECOACH_GLOBAL_REFINEMENT_RUN_URL'],
      'Définir POKECOACH_GLOBAL_REFINEMENT_RUN_URL avec un run ACB→D réel',
    );
  });
});
