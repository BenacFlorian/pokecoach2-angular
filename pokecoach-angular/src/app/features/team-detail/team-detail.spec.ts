import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import { CoachStore } from '../../core/data/coach-store';
import { MatchupPreparation } from '../../core/matchup/matchup-preparation';
import { TeamDetail } from './team-detail';

describe('TeamDetail search', () => {
  it('requests server search with debounce delay', () => {
    const store = {
      loadTeam: vi.fn(),
      loadMatchups: vi.fn(),
      clearMatchupListContext: vi.fn(),
      teamDetailState: () => 'ready' as const,
      teamDetail: () => ({
        id: 'a1111111-1111-4111-8111-111111111101',
        name: 'T',
        source: { kind: 'text' as const, rawText: 'x' },
        pokemon: [],
        createdAt: '2026-01-01',
      }),
      matchupsState: () => 'ready' as const,
      matchups: () => [],
      matchupsError: () => null,
      matchupsHasNextPage: () => false,
      matchupsLoadingMore: () => false,
      matchupsTotalCount: () => null,
    };
    const preparation = {
      snapshot: () => ({
        phase: 'idle' as const,
        teamId: null,
        matchupId: null,
        opponentId: null,
        creationError: null,
        statusMessage: null,
      }),
      leaveTeam: vi.fn(),
      submit: vi.fn(),
      acknowledgeCreated: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [TeamDetail],
      providers: [
        provideRouter([{ path: 'teams/:teamId', component: TeamDetail }]),
        { provide: CoachStore, useValue: store },
        { provide: MatchupPreparation, useValue: preparation },
        provideTransloco({ config: { availableLangs: ['fr', 'en'], defaultLang: 'fr' } }),
      ],
    });
    const fixture = TestBed.createComponent(TeamDetail);
    fixture.componentRef.setInput(
      'teamId',
      'a1111111-1111-4111-8111-111111111101',
    );
    fixture.detectChanges();
    store.loadMatchups.mockClear();
    fixture.componentInstance.onSearchInput('Incineroar');
    expect(store.loadMatchups).toHaveBeenCalledWith(
      'a1111111-1111-4111-8111-111111111101',
      'Incineroar',
      250,
    );
    fixture.componentInstance.onSearchInput('Incineroar');
    expect(store.loadMatchups).toHaveBeenCalledTimes(1);
  });
});
