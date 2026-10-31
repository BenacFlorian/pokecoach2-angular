import type { Page } from '@playwright/test';
import type { MockGraphqlState } from './graphql-mock';

export const E2E_RUN_ID = 'f6666666-6666-4666-8666-666666666601';

export async function installAnalysisApiMock(
  page: Page,
  state: MockGraphqlState,
  options?: { failFirstStart?: boolean },
): Promise<{ startCalls: () => number }> {
  let startCount = 0;
  let failOnce = Boolean(options?.failFirstStart);

  await page.route('**/api-python/analysis-capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        phases: ['A'],
        profiles: ['standard', 'smoke'],
        regulations: ['regulation-g'],
      }),
    });
  });

  await page.route('**/api-python/matchups/*/analyses', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    startCount++;
    const url = route.request().url();
    const matchupId = url.split('/matchups/')[1]?.split('/')[0] ?? '';
    if (failOnce) {
      failOnce = false;
      await route.fulfill({ status: 503, body: 'unavailable' });
      return;
    }
    const row = state.matchups.find((m) => m.id === matchupId);
    if (row) {
      row.runs = [
        {
          id: E2E_RUN_ID,
          status: 'queued',
          processStatus: 'INITIAL',
          source: 'simulation',
          createdAt: new Date().toISOString(),
          finishedAt: null,
        },
      ];
    }
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        matchupId,
        runId: E2E_RUN_ID,
        source: 'simulation',
        status: 'queued',
        processStatus: 'INITIAL',
      }),
    });
  });

  return { startCalls: () => startCount };
}
