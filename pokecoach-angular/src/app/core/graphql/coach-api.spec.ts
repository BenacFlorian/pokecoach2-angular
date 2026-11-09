import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { CoachApi } from './coach-api';
import { GRAPHQL_ENDPOINT } from './graphql-client';

describe('CoachApi', () => {
  let httpMock: HttpTestingController;
  let api: CoachApi;

  const TEAM_ID = 'a1111111-1111-4111-8111-111111111101';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_ENDPOINT, useValue: '/graphql' },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    api = TestBed.inject(CoachApi);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists owned teams', () => {
    let count = 0;
    api.listOwnedTeams().subscribe((page) => {
      count = page.items.length;
    });
    const req = httpMock.expectOne('/graphql');
    expect(req.request.body.operationName).toBe('ListOwnedTeams');
    req.flush({
      data: {
        teams: {
          nodes: [
            {
              id: TEAM_ID,
              kind: 'owned',
              name: 'Demo',
              sourceKind: 'text',
              sourceUrl: null,
              sourceText: 'x',
              pokemon: Array.from({ length: 6 }, (_, slot) => ({
                slot,
                species: 'Pikachu',
                moves: ['Thunderbolt'],
                rawBlock: 'b',
              })),
              dataVersion: 1,
              createdAt: '2026-01-01T00:00:00Z',
              isDeleted: false,
            },
          ],
          pageInfo: { endCursor: null, hasNextPage: false },
          totalCount: 1,
        },
      },
    });
    expect(count).toBe(1);
  });

  it('passes speciesQuery and cursor to ListMatchups', () => {
    api.listMatchups(TEAM_ID, 'Incineroar', 'cursor-1').subscribe();
    const req = httpMock.expectOne('/graphql');
    expect(req.request.body.operationName).toBe('ListMatchups');
    const query = req.request.body.query as string;
    const start = query.indexOf('searchTeamMatchups(');
    const end = query.indexOf(')', start);
    expect(query.slice(start, end + 1)).not.toContain('orderBy');
    expect(req.request.body.variables).toEqual({
      teamId: TEAM_ID,
      speciesQuery: 'Incineroar',
      after: 'cursor-1',
    });
    req.flush({
      data: {
        matchups: {
          nodes: [],
          pageInfo: { endCursor: null, hasNextPage: false },
          totalCount: 0,
        },
      },
    });
  });

  it('deleteOwnedTeam returns confirmed id', () => {
    let deleted = '';
    api.deleteOwnedTeam(TEAM_ID).subscribe((id) => {
      deleted = id;
    });
    const req = httpMock.expectOne('/graphql');
    expect(req.request.body.operationName).toBe('DeleteOwnedTeam');
    req.flush({
      data: { deleteOwnedTeam: { deletedTeamId: TEAM_ID } },
    });
    expect(deleted).toBe(TEAM_ID);
  });

  it('rejects inconsistent delete payload', () => {
    let errored = false;
    api.deleteOwnedTeam(TEAM_ID).subscribe({
      error: () => {
        errored = true;
      },
    });
    const req = httpMock.expectOne('/graphql');
    req.flush({
      data: { deleteOwnedTeam: { deletedTeamId: 'wrong-id' } },
    });
    expect(errored).toBe(true);
  });

  it('propagates GraphQL errors on HTTP 200', () => {
    let errored = false;
    api.deleteOwnedTeam(TEAM_ID).subscribe({
      error: () => {
        errored = true;
      },
    });
    const req = httpMock.expectOne('/graphql');
    req.flush({
      errors: [{ message: 'forbidden' }],
    });
    expect(errored).toBe(true);
  });

  it('ownedTeamExists is false when team missing', () => {
    let exists = true;
    api.ownedTeamExists(TEAM_ID).subscribe((v) => {
      exists = v;
    });
    const req = httpMock.expectOne('/graphql');
    req.flush({ data: { team: null } });
    expect(exists).toBe(false);
  });
});

declare const process: { env?: Record<string, string | undefined> };

const integrationUrl = process.env?.['POKECOACH_GRAPHQL_URL'];

describe.skipIf(!integrationUrl)('CoachApi integration', () => {
  it('creates owned team on test stack', () => {
    expect(integrationUrl).toBeTruthy();
  });
});
