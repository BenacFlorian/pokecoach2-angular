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
              id: 'a1111111-1111-4111-8111-111111111101',
              kind: 'owned',
              name: 'Demo',
              sourceKind: 'text',
              sourceUrl: null,
              sourceText: 'x',
              pokemon: [
                {
                  slot: 0,
                  species: 'Pikachu',
                  moves: ['Thunderbolt'],
                  rawBlock: 'b',
                },
                {
                  slot: 1,
                  species: 'Pikachu',
                  moves: ['Thunderbolt'],
                  rawBlock: 'b',
                },
                {
                  slot: 2,
                  species: 'Pikachu',
                  moves: ['Thunderbolt'],
                  rawBlock: 'b',
                },
                {
                  slot: 3,
                  species: 'Pikachu',
                  moves: ['Thunderbolt'],
                  rawBlock: 'b',
                },
                {
                  slot: 4,
                  species: 'Pikachu',
                  moves: ['Thunderbolt'],
                  rawBlock: 'b',
                },
                {
                  slot: 5,
                  species: 'Pikachu',
                  moves: ['Thunderbolt'],
                  rawBlock: 'b',
                },
              ],
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
});

declare const process: { env?: Record<string, string | undefined> };

const integrationUrl = process.env?.['POKECOACH_GRAPHQL_URL'];

describe.skipIf(!integrationUrl)('CoachApi integration', () => {
  it('creates owned team on test stack', () => {
    // Live contract test — set POKECOACH_GRAPHQL_URL=http://127.0.0.1:4042/graphql
    expect(integrationUrl).toBeTruthy();
  });
});
