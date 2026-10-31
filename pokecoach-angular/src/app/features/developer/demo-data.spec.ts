import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { CoachStore } from '../../core/data/coach-store';
import { DemoData } from './demo-data';

describe('DemoData', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  it('sends a single POST then navigates', () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    TestBed.configureTestingModule({
      imports: [DemoData],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        CoachStore,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DemoData);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const store = TestBed.inject(CoachStore);
    const invalidate = vi.spyOn(store, 'invalidateAll');
    const loadTeams = vi.spyOn(store, 'loadTeams');

    fixture.componentInstance.confirmAndReset();
    const req = httpMock.expectOne('/api-python/demo/seed');
    req.flush({
      source: 'mock',
      fixtureVersion: 1,
      ownedTeamIds: [
        'a1111111-1111-4111-8111-111111111101',
        'a1111111-1111-4111-8111-111111111102',
      ],
      opponentTeamId: 'b2222222-2222-4222-8222-222222222201',
      matchupId: 'c3333333-3333-4333-8333-333333333301',
      runId: 'f6666666-6666-4666-8666-666666666601',
      counts: { teams: 3, matchups: 1, runs: 1 },
    });
    const listReq = httpMock.expectOne('/graphql');
    listReq.flush({
      data: {
        teams: {
          nodes: [],
          pageInfo: { endCursor: null, hasNextPage: false },
          totalCount: 0,
        },
      },
    });
    fixture.detectChanges();

    expect(invalidate).toHaveBeenCalled();
    expect(loadTeams).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
