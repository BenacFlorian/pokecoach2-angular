import { Injectable } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';
import type { PreparedMatchup } from '../models/matchup.model';
import type { Team } from '../models/team.model';
import { buildMockMatchupReport } from './demo-reports';

const PREPARE_DELAY_MS = 400;

@Injectable({ providedIn: 'root' })
export class MockMatchupPreparation {
  prepare(ours: Team, opponent: Team): Observable<PreparedMatchup> {
    const report = buildMockMatchupReport(ours, opponent);
    const opponentTeam: Team = {
      ...opponent,
      id: crypto.randomUUID(),
      name: opponent.name,
      createdAt: new Date().toISOString(),
    };

    const prepared: PreparedMatchup = {
      id: crypto.randomUUID(),
      teamId: ours.id,
      opponent: opponentTeam,
      report,
      createdAt: new Date().toISOString(),
    };

    return of(prepared).pipe(
      tap(() => {
        console.log('[mock] prepare-matchup', { ours, opponent: opponentTeam });
      }),
      delay(PREPARE_DELAY_MS),
    );
  }
}
