import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideTransloco } from '@jsverse/transloco';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CoachApi } from '../../core/graphql/coach-api';
import { CoachStore } from '../../core/data/coach-store';
import { MatchupPreparation } from '../../core/matchup/matchup-preparation';
import { GRAPHQL_ENDPOINT } from '../../core/graphql/graphql-client';
import { TeamDeleteDialog } from './team-delete-dialog';
import type { Team } from '../../core/models/team.model';

const TEAM: Team = {
  id: 'a1111111-1111-4111-8111-111111111101',
  name: 'Demo',
  source: { kind: 'text', rawText: 'x' },
  pokemon: [
    { slot: 0, species: 'Pikachu', moves: ['Thunderbolt'], rawBlock: 'b' },
    { slot: 1, species: 'Pikachu', moves: ['Thunderbolt'], rawBlock: 'b' },
    { slot: 2, species: 'Pikachu', moves: ['Thunderbolt'], rawBlock: 'b' },
    { slot: 3, species: 'Pikachu', moves: ['Thunderbolt'], rawBlock: 'b' },
    { slot: 4, species: 'Pikachu', moves: ['Thunderbolt'], rawBlock: 'b' },
    { slot: 5, species: 'Pikachu', moves: ['Thunderbolt'], rawBlock: 'b' },
  ],
  createdAt: '2026-01-01T00:00:00Z',
};

describe('TeamDeleteDialog', () => {
  let httpMock: HttpTestingController;
  const preparation = { forgetTeam: vi.fn() };
  const store = { invalidateAll: vi.fn() };

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    TestBed.configureTestingModule({
      imports: [TeamDeleteDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_ENDPOINT, useValue: '/graphql' },
        { provide: MatchupPreparation, useValue: preparation },
        { provide: CoachStore, useValue: store },
        { provide: Router, useValue: { navigate: vi.fn() } },
        provideTransloco({ config: { availableLangs: ['fr', 'en'], defaultLang: 'fr' } }),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('confirm issues single delete mutation', () => {
    const dialog = TestBed.createComponent(TeamDeleteDialog).componentInstance;
    const deleted = vi.fn();
    dialog.deleted.subscribe(deleted);
    dialog.open(TEAM, document.createElement('button'));
    dialog.confirmDelete();
    const req = httpMock.expectOne('/graphql');
    expect(req.request.body.operationName).toBe('DeleteOwnedTeam');
    req.flush({ data: { deleteOwnedTeam: { deletedTeamId: TEAM.id } } });
    expect(deleted).toHaveBeenCalledWith(TEAM.id);
    expect(store.invalidateAll).toHaveBeenCalled();
  });
});
