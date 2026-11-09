import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CoachStore } from '../../core/data/coach-store';
import { Home } from './home';

describe('Home', () => {
  it('reloads teams after successful import', () => {
    const store = {
      loadTeams: vi.fn(),
      createOwnedTeam: vi.fn(() =>
        of({
          id: 'a1111111-1111-4111-8111-111111111101',
          name: 'X',
          source: { kind: 'text' as const, rawText: 'y' },
          pokemon: [],
          createdAt: '2026-01-01T00:00:00Z',
        }),
      ),
      reconcileOwnedTeam: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: CoachStore, useValue: store },
        provideTransloco({ config: { availableLangs: ['fr', 'en'], defaultLang: 'fr' } }),
      ],
    });
    const home = TestBed.createComponent(Home).componentInstance;
    home.onTeamImported({
      name: 'X',
      imported: {
        source: { kind: 'text', rawText: 'y' },
        warnings: [],
        pokemon: Array.from({ length: 6 }, (_, slot) => ({
          slot: slot as 0,
          species: 'P',
          moves: ['m'],
          rawBlock: 'b',
        })) as never,
      },
    });
    expect(store.loadTeams).toHaveBeenCalled();
  });
});
