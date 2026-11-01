import { test, expect } from '@playwright/test';
import {
  createMockGraphqlState,
  installGraphqlMock,
} from './fixtures/graphql-mock';

test.describe('ouvertures conditionnées (mock GraphQL)', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('placeholder — étendre le mock GraphQL avec partialResult openings/ac', async ({
    page,
  }) => {
    test.skip(true, 'Mock run AC/ACB à brancher sur fixtures openings/');
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
