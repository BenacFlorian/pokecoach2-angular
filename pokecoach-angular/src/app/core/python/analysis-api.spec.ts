import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { AnalysisApi } from './analysis-api';
import { AnalysisError } from './analysis-error';

const MATCHUP_ID = 'c3333333-3333-4333-8333-333333333301';
const RUN_ID = 'f6666666-6666-4666-8666-666666666601';
const KEY = 'd4444444-4444-4444-8444-444444444401';

describe('AnalysisApi', () => {
  let httpMock: HttpTestingController;
  let api: AnalysisApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    api = TestBed.inject(AnalysisApi);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads capabilities from relative url', () => {
    let phases: string[] = [];
    api.capabilities().subscribe((view) => {
      phases = view.phases;
    });
    const req = httpMock.expectOne('/api-python/analysis-capabilities');
    expect(req.request.method).toBe('GET');
    req.flush({
      phases: ['A'],
      profiles: ['standard', 'smoke'],
      regulations: ['M-B'],
    });
    expect(phases).toEqual(['A']);
  });

  it('posts start with idempotency header and body', () => {
    api
      .start(MATCHUP_ID, { targetPhase: 'A', profile: 'standard' }, KEY)
      .subscribe();
    const req = httpMock.expectOne(
      `/api-python/matchups/${MATCHUP_ID}/analyses`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe(KEY);
    expect(req.request.body).toEqual({ targetPhase: 'A', profile: 'standard' });
    req.flush(
      {
        matchupId: MATCHUP_ID,
        runId: RUN_ID,
        source: 'simulation',
        status: 'queued',
        processStatus: 'INITIAL',
      },
      { status: 202, statusText: 'Accepted' },
    );
  });

  it('accepts idempotent 200 response', () => {
    let status = 0;
    api
      .start(MATCHUP_ID, { targetPhase: 'A', profile: 'standard' }, KEY)
      .subscribe((res) => {
        status = res.httpStatus;
      });
    const req = httpMock.expectOne(
      `/api-python/matchups/${MATCHUP_ID}/analyses`,
    );
    req.flush(
      {
        matchupId: MATCHUP_ID,
        runId: RUN_ID,
        source: 'simulation',
        status: 'succeeded',
        processStatus: 'SUCCESS',
      },
      { status: 200, statusText: 'OK' },
    );
    expect(status).toBe(200);
  });

  it('rejects invalid matchup uuid before http', () => {
    let err: unknown;
    api.start('not-a-uuid', { targetPhase: 'A', profile: 'standard' }, KEY).subscribe({
      error: (e) => {
        err = e;
      },
    });
    httpMock.expectNone(`/api-python/matchups/not-a-uuid/analyses`);
    expect(err).toBeInstanceOf(AnalysisError);
  });

  it('rejects response for another matchup', () => {
    let err: unknown;
    api
      .start(MATCHUP_ID, { targetPhase: 'A', profile: 'standard' }, KEY)
      .subscribe({
        error: (e) => {
          err = e;
        },
      });
    const req = httpMock.expectOne(
      `/api-python/matchups/${MATCHUP_ID}/analyses`,
    );
    req.flush(
      {
        matchupId: 'a1111111-1111-4111-8111-111111111101',
        runId: RUN_ID,
        source: 'simulation',
        status: 'queued',
        processStatus: 'INITIAL',
      },
      { status: 202, statusText: 'Accepted' },
    );
    expect(err).toBeInstanceOf(AnalysisError);
  });

  it('maps http 422 to validation error', () => {
    let err: unknown;
    api
      .start(MATCHUP_ID, { targetPhase: 'Z', profile: 'standard' }, KEY)
      .subscribe({
        error: (e) => {
          err = e;
        },
      });
    const req = httpMock.expectOne(
      `/api-python/matchups/${MATCHUP_ID}/analyses`,
    );
    req.flush(
      { detail: { message: 'Phase invalide.' } },
      { status: 422, statusText: 'Unprocessable' },
    );
    expect(err).toBeInstanceOf(AnalysisError);
    expect((err as AnalysisError).kind).toBe('validation');
  });
});
