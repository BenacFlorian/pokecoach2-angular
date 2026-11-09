import { test } from '@playwright/test';

test.describe.skip('cycle de vie équipe (live)', () => {
  test('backend réel', async () => {
    // Exécuter uniquement quand la stack live est configurée (cf. autres *-live.spec.ts).
  });
});
