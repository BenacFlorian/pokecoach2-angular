import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  type AnalysisCapabilitiesResponse,
  type AnalysisCapabilitiesView,
  type AnalysisContinueRequest,
  type AnalysisStartRequest,
  type AnalysisStartResponse,
  type AnalysisStartResult,
  mapCapabilitiesView,
} from './analysis-api.models';
import { AnalysisError, mapHttpAnalysisError } from './analysis-error';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAnalysisUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function validateCapabilitiesBody(body: AnalysisCapabilitiesResponse): AnalysisCapabilitiesView {
  if (
    !Array.isArray(body.phases) ||
    !Array.isArray(body.profiles) ||
    !Array.isArray(body.regulations)
  ) {
    throw new AnalysisError('response', 'Réponse de capacités invalide.');
  }
  if (body.phases.length === 0 || body.regulations.length === 0) {
    throw new AnalysisError(
      'capabilities',
      'Aucune analyse n’est disponible pour le moment.',
      { retryable: true },
    );
  }
  return mapCapabilitiesView(body);
}

function validateCommandBody(
  body: AnalysisStartResponse | null,
  httpStatus: number,
  expectedMatchupId: string | null,
): AnalysisStartResult {
  if (!body || (httpStatus !== 200 && httpStatus !== 202)) {
    throw new AnalysisError('response', 'Réponse de commande invalide.');
  }
  if (!isAnalysisUuid(body.matchupId) || !isAnalysisUuid(body.runId)) {
    throw new AnalysisError('response', 'Identifiants de run invalides.');
  }
  if (expectedMatchupId && body.matchupId !== expectedMatchupId) {
    throw new AnalysisError(
      'response',
      'La réponse ne correspond pas au matchup demandé.',
    );
  }
  if (body.source !== 'simulation') {
    throw new AnalysisError('response', 'Source de run inattendue.');
  }
  if (
    httpStatus === 202 &&
    body.status !== 'queued' &&
    body.status !== 'running'
  ) {
    throw new AnalysisError('response', 'Statut de run inattendu.');
  }
  return {
    ...body,
    httpStatus: httpStatus as 200 | 202,
  };
}

@Injectable({ providedIn: 'root' })
export class AnalysisApi {
  private readonly http = inject(HttpClient);

  capabilities(): Observable<AnalysisCapabilitiesView> {
    return this.http
      .get<AnalysisCapabilitiesResponse>('/api-python/analysis-capabilities')
      .pipe(
        map((body) => validateCapabilitiesBody(body)),
        catchError((err: unknown) =>
          throwError(() =>
            err instanceof AnalysisError ? err : mapHttpAnalysisError(err, 'capabilities'),
          ),
        ),
      );
  }

  start(
    matchupId: string,
    request: AnalysisStartRequest,
    idempotencyKey: string,
  ): Observable<AnalysisStartResult> {
    if (!isAnalysisUuid(matchupId)) {
      return throwError(
        () => new AnalysisError('validation', 'Identifiant de matchup invalide.'),
      );
    }
    if (!isAnalysisUuid(idempotencyKey)) {
      return throwError(
        () => new AnalysisError('validation', 'Clé d’idempotence invalide.'),
      );
    }
    return this.http
      .post<AnalysisStartResponse>(
        `/api-python/matchups/${matchupId}/analyses`,
        request,
        {
          headers: { 'Idempotency-Key': idempotencyKey },
          observe: 'response',
        },
      )
      .pipe(
        map((res: HttpResponse<AnalysisStartResponse>) =>
          validateCommandBody(res.body, res.status, matchupId),
        ),
        catchError((err: unknown) =>
          throwError(() =>
            err instanceof AnalysisError ? err : mapHttpAnalysisError(err, 'start'),
          ),
        ),
      );
  }

  continue(
    runId: string,
    request: AnalysisContinueRequest,
    idempotencyKey: string,
  ): Observable<AnalysisStartResult> {
    if (!isAnalysisUuid(runId) || !isAnalysisUuid(idempotencyKey)) {
      return throwError(
        () => new AnalysisError('validation', 'Identifiants invalides.'),
      );
    }
    return this.http
      .post<AnalysisStartResponse>(
        `/api-python/analyses/${runId}/continue`,
        request,
        {
          headers: { 'Idempotency-Key': idempotencyKey },
          observe: 'response',
        },
      )
      .pipe(
        map((res: HttpResponse<AnalysisStartResponse>) =>
          validateCommandBody(res.body, res.status, null),
        ),
        catchError((err: unknown) =>
          throwError(() =>
            err instanceof AnalysisError ? err : mapHttpAnalysisError(err, 'continue'),
          ),
        ),
      );
  }

  cancel(runId: string, idempotencyKey: string): Observable<AnalysisStartResult> {
    if (!isAnalysisUuid(runId) || !isAnalysisUuid(idempotencyKey)) {
      return throwError(
        () => new AnalysisError('validation', 'Identifiants invalides.'),
      );
    }
    return this.http
      .post<AnalysisStartResponse>(
        `/api-python/analyses/${runId}/cancel`,
        null,
        {
          headers: { 'Idempotency-Key': idempotencyKey },
          observe: 'response',
        },
      )
      .pipe(
        map((res: HttpResponse<AnalysisStartResponse>) =>
          validateCommandBody(res.body, res.status, null),
        ),
        catchError((err: unknown) =>
          throwError(() =>
            err instanceof AnalysisError ? err : mapHttpAnalysisError(err, 'cancel'),
          ),
        ),
      );
  }
}
