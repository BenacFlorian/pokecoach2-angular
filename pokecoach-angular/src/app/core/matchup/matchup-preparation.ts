import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CoachStore } from '../data/coach-store';
import { userMessageForGraphqlError } from '../graphql/graphql-error';
import type { MatchupSummary } from '../graphql/coach-mappers';
import { AnalysisApi } from '../python/analysis-api';
import type { AnalysisCapabilitiesView } from '../python/analysis-api.models';
import {
  clearPendingAnalysisMarker,
  readPendingAnalysisMarker,
} from '../python/pending-analysis-command';
import type { TeamImportSubmit } from '../../shared/teams/team-import-dialog';

export type MatchupPreparationPhase =
  | 'idle'
  | 'creating'
  | 'reconciling'
  | 'accepted'
  | 'creation-error';

export interface MatchupPreparationSnapshot {
  phase: MatchupPreparationPhase;
  teamId: string | null;
  matchupId: string | null;
  opponentId: string | null;
  creationError: string | null;
  statusMessage: string | null;
}

interface TeamCommandState {
  phase: MatchupPreparationPhase;
  teamId: string;
  matchupId: string | null;
  opponentId: string | null;
  pendingIds: { matchupId: string; opponentId: string } | null;
  creationError: string | null;
  commandGen: number;
}

@Injectable({ providedIn: 'root' })
export class MatchupPreparation {
  private readonly store = inject(CoachStore);
  private readonly analysisApi = inject(AnalysisApi);

  private readonly activeTeamId = signal<string | null>(null);
  private readonly teamsRevision = signal(0);
  private readonly teams = new Map<string, TeamCommandState>();
  private chainSub: Subscription | null = null;
  private readonly capabilitiesState = signal<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  private readonly capabilities = signal<AnalysisCapabilitiesView | null>(null);
  private readonly capabilitiesError = signal<string | null>(null);
  private capabilitiesSub: Subscription | null = null;

  readonly snapshot = computed<MatchupPreparationSnapshot>(() => {
    this.teamsRevision();
    const teamId = this.activeTeamId();
    if (!teamId) {
      return {
        phase: 'idle',
        teamId: null,
        matchupId: null,
        opponentId: null,
        creationError: null,
        statusMessage: null,
      };
    }
    const state = this.teams.get(teamId);
    if (!state) {
      return {
        phase: 'idle',
        teamId: null,
        matchupId: null,
        opponentId: null,
        creationError: null,
        statusMessage: null,
      };
    }
    let statusMessage: string | null = null;
    if (state.phase === 'creating' || state.phase === 'reconciling') {
      statusMessage = 'Enregistrement du matchup…';
    }
    return {
      phase: state.phase,
      teamId: state.teamId,
      matchupId: state.matchupId,
      opponentId: state.opponentId,
      creationError: state.creationError,
      statusMessage,
    };
  });

  readonly capabilitiesView = computed(() => this.capabilities());
  readonly capabilitiesLoading = computed(
    () => this.capabilitiesState() === 'loading',
  );
  readonly capabilitiesLoadError = computed(() => this.capabilitiesError());

  loadCapabilities(force = false): void {
    if (
      !force &&
      (this.capabilitiesState() === 'loading' || this.capabilitiesState() === 'ready')
    ) {
      return;
    }
    this.capabilitiesSub?.unsubscribe();
    this.capabilitiesState.set('loading');
    this.capabilitiesError.set(null);
    this.capabilitiesSub = this.analysisApi.capabilities().subscribe({
      next: (view) => {
        this.capabilities.set(view);
        this.capabilitiesState.set('ready');
      },
      error: () => {
        this.capabilitiesState.set('error');
        this.capabilitiesError.set('Impossible de charger les capacités d’analyse.');
      },
    });
  }

  submit(teamId: string, payload: TeamImportSubmit): void {
    if (this.chainSub) {
      return;
    }
    this.activeTeamId.set(teamId);
    let state = this.teams.get(teamId);
    if (!state) {
      state = {
        phase: 'idle',
        teamId,
        matchupId: null,
        opponentId: null,
        pendingIds: null,
        creationError: null,
        commandGen: 0,
      };
      this.teams.set(teamId, state);
    }
    state.commandGen++;
    state.creationError = null;
    if (!state.pendingIds) {
      state.pendingIds = {
        matchupId: crypto.randomUUID(),
        opponentId: crypto.randomUUID(),
      };
    }
    const ids = state.pendingIds;
    state.matchupId = ids.matchupId;
    state.opponentId = ids.opponentId;
    state.phase = 'creating';
    const gen = state.commandGen;
    this.bumpTeams();

    this.chainSub = this.store
      .createOpponentMatchup(ids, teamId, payload.name, payload.imported)
      .subscribe({
        next: (summary) => this.finishCreatedMatchup(teamId, gen, summary),
        error: (err) => this.handleCreationFailure(teamId, gen, ids, err),
      });
  }

  acknowledgeCreated(matchupId: string): void {
    const teamId = this.activeTeamId();
    if (!teamId) {
      return;
    }
    const state = this.teams.get(teamId);
    if (!state || state.phase !== 'accepted' || state.matchupId !== matchupId) {
      return;
    }
    state.phase = 'idle';
    state.matchupId = null;
    state.opponentId = null;
    state.pendingIds = null;
    state.creationError = null;
    this.bumpTeams();
  }

  leaveTeam(teamId: string): void {
    const state = this.teams.get(teamId);
    if (state) {
      state.commandGen++;
    }
    if (this.activeTeamId() === teamId) {
      this.activeTeamId.set(null);
    }
    this.chainSub?.unsubscribe();
    this.chainSub = null;
    this.bumpTeams();
  }

  forgetTeam(teamId: string): void {
    this.teams.delete(teamId);
    if (this.activeTeamId() === teamId) {
      this.activeTeamId.set(null);
    }
    this.chainSub?.unsubscribe();
    this.chainSub = null;
    this.bumpTeams();
    const marker = readPendingAnalysisMarker();
    if (marker && marker.teamId === teamId) {
      clearPendingAnalysisMarker();
    }
  }

  private bumpTeams(): void {
    this.teamsRevision.update((n) => n + 1);
  }

  private finishCreatedMatchup(
    teamId: string,
    gen: number,
    summary: MatchupSummary,
  ): void {
    const state = this.teams.get(teamId);
    if (!state || gen !== state.commandGen) {
      return;
    }
    if (state.pendingIds && summary.id !== state.pendingIds.matchupId) {
      return;
    }
    state.pendingIds = null;
    state.matchupId = summary.id;
    state.phase = 'accepted';
    this.chainSub = null;
    this.activeTeamId.set(teamId);
    this.bumpTeams();
  }

  private handleCreationFailure(
    teamId: string,
    gen: number,
    ids: { matchupId: string; opponentId: string },
    err: unknown,
  ): void {
    const state = this.teams.get(teamId);
    if (!state || gen !== state.commandGen) {
      return;
    }
    state.creationError = userMessageForGraphqlError(err);
    state.phase = 'reconciling';
    this.bumpTeams();
    this.chainSub?.unsubscribe();
    this.chainSub = this.store.reconcileMatchup(teamId, ids.matchupId).subscribe({
      next: (detail) => {
        this.chainSub = null;
        const current = this.teams.get(teamId);
        if (!current || gen !== current.commandGen) {
          return;
        }
        if (detail && detail.teamId === teamId) {
          this.finishCreatedMatchup(teamId, gen, {
            id: detail.id,
            teamId: detail.teamId,
            opponent: detail.opponentTeam,
            createdAt: detail.createdAt,
            latestRun: detail.latestRun,
            hasSuccessfulReport: detail.successfulResult.kind === 'valid',
            regulation: detail.regulation,
          });
          return;
        }
        current.phase = 'creation-error';
        this.bumpTeams();
      },
      error: () => {
        this.chainSub = null;
        const current = this.teams.get(teamId);
        if (!current || gen !== current.commandGen) {
          return;
        }
        current.phase = 'creation-error';
        this.bumpTeams();
      },
    });
  }

  /** Test helper */
  resetForTests(): void {
    this.chainSub?.unsubscribe();
    this.capabilitiesSub?.unsubscribe();
    this.chainSub = null;
    this.capabilitiesSub = null;
    this.teams.clear();
    this.activeTeamId.set(null);
    clearPendingAnalysisMarker();
  }
}
