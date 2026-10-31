import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, NEVER } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CoachStore } from '../data/coach-store';
import { AnalysisApi } from '../python/analysis-api';
import { MatchupPreparation } from './matchup-preparation';
import type { TeamImportSubmit } from '../../shared/teams/team-import-dialog';

const TEAM_ID = 'a1111111-1111-4111-8111-111111111101';
const MATCHUP_ID = 'c3333333-3333-4333-8333-333333333301';
const OPPONENT_ID = 'b2222222-2222-4222-8222-222222222201';
const ANALYSIS_KEY = 'd4444444-4444-4444-8444-444444444401';

function stubSubmissionIds(): void {
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce(MATCHUP_ID)
    .mockReturnValueOnce(OPPONENT_ID)
    .mockReturnValueOnce(ANALYSIS_KEY);
}

describe('MatchupPreparation', () => {
  const store = {
    createOpponentMatchup: vi.fn(),
    reconcileMatchup: vi.fn(),
    appendMatchup: vi.fn(),
    loadMatchups: vi.fn(),
  };
  const analysisApi = {
    start: vi.fn(),
    capabilities: vi.fn(),
  };
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        MatchupPreparation,
        { provide: CoachStore, useValue: store },
        { provide: AnalysisApi, useValue: analysisApi },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('does not call python before graphql success', () => {
    stubSubmissionIds();
    store.createOpponentMatchup.mockReturnValue(NEVER);
    const prep = TestBed.inject(MatchupPreparation);
    prep.submit(TEAM_ID, samplePayload());
    expect(analysisApi.start).not.toHaveBeenCalled();
  });

  it('does not call python after creation', async () => {
    stubSubmissionIds();
    store.createOpponentMatchup.mockReturnValue(
      of({
        id: MATCHUP_ID,
        teamId: TEAM_ID,
        opponent: { id: OPPONENT_ID, name: 'Adv' },
        createdAt: '2026-01-01T00:00:00Z',
        regulation: null,
        latestRun: null,
        hasSuccessfulReport: false,
      }),
    );
    const prep = TestBed.inject(MatchupPreparation);
    prep.submit(TEAM_ID, samplePayload());
    await new Promise<void>((r) => queueMicrotask(() => r()));
    expect(analysisApi.start).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('surfaces creation errors without python', () => {
    stubSubmissionIds();
    store.createOpponentMatchup.mockReturnValue(throwError(() => new Error('graphql')));
    store.reconcileMatchup.mockReturnValue(of(null));
    const prep = TestBed.inject(MatchupPreparation);
    prep.submit(TEAM_ID, samplePayload());
    expect(prep.snapshot().phase).toBe('creation-error');
    expect(analysisApi.start).not.toHaveBeenCalled();
  });
});

function samplePayload(): TeamImportSubmit {
  return {
    name: 'Adv',
    imported: {
      source: { kind: 'text', rawText: 'x' },
      warnings: [],
      pokemon: [
        { slot: 0, species: 'P', moves: ['m'], rawBlock: 'b' },
        { slot: 1, species: 'P', moves: ['m'], rawBlock: 'b' },
        { slot: 2, species: 'P', moves: ['m'], rawBlock: 'b' },
        { slot: 3, species: 'P', moves: ['m'], rawBlock: 'b' },
        { slot: 4, species: 'P', moves: ['m'], rawBlock: 'b' },
        { slot: 5, species: 'P', moves: ['m'], rawBlock: 'b' },
      ],
    },
  };
}
