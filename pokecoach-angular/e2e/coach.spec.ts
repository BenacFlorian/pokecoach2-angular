import { test, expect } from '@playwright/test';

const SAMPLE_PASTE = `Pikachu @ Light Ball
Ability: Static
Level: 50
- Thunderbolt
- Fake Out
- Protect
- Volt Switch

Eevee @ Eviolite
Ability: Adaptability
Level: 50
- Hyper Voice
- Protect
- Helping Hand
- Tail Whip

Snorlax @ Leftovers
Ability: Gluttony
Level: 50
- Body Slam
- Protect
- Yawn
- Rest

Lucario @ Life Orb
Ability: Inner Focus
Level: 50
- Close Combat
- Protect
- Extreme Speed
- Bullet Punch

Clefairy @ Eviolite
Ability: Friend Guard
Level: 50
- Follow Me
- Protect
- Helping Hand
- After You

Togepi @ Eviolite
Ability: Super Luck
Level: 50
- Follow Me
- Protect
- Helping Hand
- Ancient Power
`;

test.describe('parcours pokecoach', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
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
  });

  test('accueil, équipe texte, adversaire mock, onglets', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Ajouter une équipe' }).click();
    await page.getByLabel('Nom').fill('Équipe E2E');
    await page.getByLabel('Texte Showdown').click();
    await page.locator('textarea').fill(SAMPLE_PASTE);
    await page.getByRole('button', { name: 'Valider' }).click();

    await page.getByRole('link', { name: /Équipe E2E/ }).click();
    await expect(page.getByText('Aucun adversaire préparé')).toBeVisible();

    await page.route('https://pokepast.es/**', async (route) => {
      await route.fulfill({ status: 200, body: SAMPLE_PASTE });
    });

    await page.getByRole('button', { name: 'Préparer un match up' }).click();
    await page.getByLabel('Nom').fill('Adv URL');
    await page.getByPlaceholder('https://pokepast.es').fill('https://pokepast.es/e2e-test');
    await page.getByRole('button', { name: 'Valider' }).click();

    await expect(page.getByRole('link', { name: /Adv URL/ })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('link', { name: /Adv URL/ }).click();
    await expect(page.getByText('Données de démonstration')).toBeVisible();
    await page.getByRole('tab', { name: 'Lead & pick' }).click();
    await page.getByRole('tab', { name: 'Gameplan' }).click();
    await page.getByRole('link', { name: 'pokecoach' }).click();
    await expect(page.getByRole('heading', { name: 'Nos équipes' })).toBeVisible();
  });
});
