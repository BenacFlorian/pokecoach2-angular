import { Injectable, signal } from '@angular/core';
import type { PreparedMatchup } from '../models/matchup.model';
import type { ImportedTeam, Team } from '../models/team.model';
import {
  buildMockMatchupReport,
} from './demo-reports';
import {
  DEMO_OPPONENT_TEAM,
  DEMO_TEAM_EMPTY,
  DEMO_TEAM_WITH_MATCHUP,
} from './demo-teams';
import {
  COACH_STORAGE_KEY,
  loadCoachSnapshot,
  saveCoachSnapshot,
  type CoachSnapshot,
} from './coach-storage';

@Injectable({ providedIn: 'root' })
export class CoachStore {
  private readonly teamsSignal = signal<Team[]>([]);
  private readonly matchupsSignal = signal<PreparedMatchup[]>([]);
  private readonly storageWarningSignal = signal<string | null>(null);
  private demoInitialized = false;

  readonly teams = this.teamsSignal.asReadonly();
  readonly matchups = this.matchupsSignal.asReadonly();
  readonly storageWarning = this.storageWarningSignal.asReadonly();

  constructor() {
    this.bootstrap();
  }

  private bootstrap(): void {
    const loaded = loadCoachSnapshot();
    if (loaded.kind === 'ok') {
      this.teamsSignal.set(loaded.snapshot.teams);
      this.matchupsSignal.set(loaded.snapshot.matchups);
      this.demoInitialized = true;
      return;
    }
    if (loaded.kind === 'error') {
      this.storageWarningSignal.set(loaded.message);
    }
    this.seedDemoOnce();
  }

  private seedDemoOnce(): void {
    if (this.demoInitialized) {
      return;
    }
    this.demoInitialized = true;

    const report = buildMockMatchupReport(
      DEMO_TEAM_WITH_MATCHUP,
      DEMO_OPPONENT_TEAM,
    );
    const demoMatchup: PreparedMatchup = {
      id: 'demo-matchup-1',
      teamId: DEMO_TEAM_WITH_MATCHUP.id,
      opponent: DEMO_OPPONENT_TEAM,
      report,
      createdAt: '2026-10-01T10:30:00.000Z',
    };

    this.teamsSignal.set([DEMO_TEAM_WITH_MATCHUP, DEMO_TEAM_EMPTY]);
    this.matchupsSignal.set([demoMatchup]);
    this.persist();
  }

  addTeam(name: string, imported: ImportedTeam): Team {
    const team: Team = {
      id: crypto.randomUUID(),
      name: name.trim(),
      source: imported.source,
      pokemon: imported.pokemon,
      createdAt: new Date().toISOString(),
    };
    this.teamsSignal.update((teams) => [...teams, team]);
    this.persist();
    return team;
  }

  getTeam(id: string): Team | undefined {
    return this.teamsSignal().find((t) => t.id === id);
  }

  matchupsFor(teamId: string): PreparedMatchup[] {
    return this.matchupsSignal().filter((m) => m.teamId === teamId);
  }

  getMatchup(teamId: string, matchupId: string): PreparedMatchup | undefined {
    const matchup = this.matchupsSignal().find((m) => m.id === matchupId);
    if (!matchup || matchup.teamId !== teamId) {
      return undefined;
    }
    return matchup;
  }

  addMatchup(matchup: PreparedMatchup): void {
    this.matchupsSignal.update((list) => [...list, matchup]);
    this.persist();
  }

  snapshot(): CoachSnapshot {
    return {
      schemaVersion: 1,
      teams: this.teamsSignal(),
      matchups: this.matchupsSignal(),
    };
  }

  private persist(): void {
    const result = saveCoachSnapshot(this.snapshot());
    if (result.kind === 'error') {
      this.storageWarningSignal.set(result.message);
    } else {
      this.storageWarningSignal.set(null);
    }
  }

  /** Test helper */
  resetForTests(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(COACH_STORAGE_KEY);
    }
    this.teamsSignal.set([]);
    this.matchupsSignal.set([]);
    this.demoInitialized = false;
    this.storageWarningSignal.set(null);
    this.seedDemoOnce();
  }
}

export { COACH_STORAGE_KEY };
