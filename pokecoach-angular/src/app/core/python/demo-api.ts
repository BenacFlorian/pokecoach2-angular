import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DemoSeedResponse {
  source: string;
  fixtureVersion: number;
  ownedTeamIds: string[];
  opponentTeamId: string;
  matchupId: string;
  runId: string;
  counts: { teams: number; matchups: number; runs: number };
}

export interface DemoApiErrorBody {
  detail?: { code?: string; message?: string };
}

@Injectable({ providedIn: 'root' })
export class DemoApi {
  private readonly http = inject(HttpClient);

  resetSeed(): Observable<DemoSeedResponse> {
    return this.http.post<DemoSeedResponse>('/api-python/demo/seed', {}).pipe(
      map((body) => validateDemoSeedResponse(body)),
      catchError((err: unknown) => throwError(() => normalizeDemoError(err))),
    );
  }
}

export function validateDemoSeedResponse(body: DemoSeedResponse): DemoSeedResponse {
  if (body.source !== 'mock' || body.fixtureVersion !== 1) {
    throw new Error('Réponse de démonstration invalide.');
  }
  for (const id of [...body.ownedTeamIds, body.opponentTeamId, body.matchupId, body.runId]) {
    if (!UUID_RE.test(id)) {
      throw new Error('Identifiant invalide dans la réponse.');
    }
  }
  if (body.counts.teams !== 3 || body.counts.matchups !== 1 || body.counts.runs !== 1) {
    throw new Error('Compteurs de démonstration inattendus.');
  }
  return body;
}

export function demoErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'La réinstallation de démonstration a échoué.';
}

function normalizeDemoError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as DemoApiErrorBody | null;
    const code = body?.detail?.code;
    const message = body?.detail?.message;
    if (code === 'DEMO_BUSY') {
      return new Error(message ?? 'Une réinstallation est déjà en cours.');
    }
    if (code === 'DEMO_REFERENCED') {
      return new Error(message ?? 'Conflit avec un autre matchup.');
    }
    if (code === 'DEMO_DISABLED') {
      return new Error(message ?? 'Commande désactivée côté API.');
    }
    if (message) {
      return new Error(message);
    }
  }
  return new Error(demoErrorMessage(err));
}
