import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CoachStore } from './coach-store';

describe('CoachStore', () => {
  it('invalidateAll bumps generations and clears resources', () => {
    TestBed.configureTestingModule({ providers: [CoachStore] });
    const store = TestBed.inject(CoachStore);
    store.loadTeams();
    store.invalidateAll();
    expect(store.teamsState()).toBe('idle');
    expect(store.teams()).toEqual([]);
  });
});
