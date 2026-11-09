import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CoachApi } from '../graphql/coach-api';
import { CoachStore } from './coach-store';

describe('CoachStore', () => {
  it('invalidateAll bumps generations and clears resources', () => {
    const api = { listOwnedTeams: vi.fn(() => new Subject().asObservable()) };
    TestBed.configureTestingModule({
      providers: [CoachStore, { provide: CoachApi, useValue: api }],
    });
    const store = TestBed.inject(CoachStore);
    store.loadTeams();
    store.invalidateAll();
    expect(store.teamsState()).toBe('idle');
    expect(store.teams()).toEqual([]);
  });

  it('ignores stale matchup responses after filter change', () => {
    const responses: Subject<{
      items: [];
      endCursor: null;
      hasNextPage: false;
      totalCount: number;
    }>[] = [];
    const api = {
      listMatchups: vi.fn(() => {
        const s = new Subject<{
          items: [];
          endCursor: null;
          hasNextPage: false;
          totalCount: number;
        }>();
        responses.push(s);
        return s.asObservable();
      }),
      listOwnedTeams: vi.fn(),
      getOwnedTeam: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [CoachStore, { provide: CoachApi, useValue: api }],
    });
    const store = TestBed.inject(CoachStore);
    const teamId = 'a1111111-1111-4111-8111-111111111101';
    store.loadMatchups(teamId, 'a', 0);
    store.loadMatchups(teamId, 'b', 0);
    responses[0]!.next({
      items: [],
      endCursor: null,
      hasNextPage: false,
      totalCount: 99,
    });
    expect(store.matchupsTotalCount()).not.toBe(99);
    responses[1]!.next({
      items: [],
      endCursor: null,
      hasNextPage: false,
      totalCount: 1,
    });
    expect(store.matchupsTotalCount()).toBe(1);
  });
});
