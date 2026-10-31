import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, afterEach } from 'vitest';
import { DemoApi, validateDemoSeedResponse } from './demo-api';

describe('DemoApi', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  it('posts empty body to demo seed route', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(DemoApi);
    const sub = api.resetSeed().subscribe();
    const req = httpMock.expectOne('/api-python/demo/seed');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
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
    sub.unsubscribe();
  });

  it('validates response shape', () => {
    const body = validateDemoSeedResponse({
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
    expect(body.matchupId).toContain('c3333333');
  });
});
