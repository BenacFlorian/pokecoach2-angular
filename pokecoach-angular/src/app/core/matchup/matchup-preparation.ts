import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CoachStore } from '../data/coach-store';
import { userMessageForGraphqlError } from '../graphql/graphql-error';
import type { MatchupSummary } from '../graphql/coach-mappers';
import { AnalysisApi } from '../python/analysis-api';
import type { AnalysisCapabilitiesView, AnalysisStartRequest } from '../python/analysis-api.models';
import { analysisErrorMessage, AnalysisError } from '../python/analysis-error';
import { LocaleService } from '../i18n/locale.service';
import {
  clearPendingAnalysisMarker,
  writePendingAnalysisMarker,
} from '../python/pending-analysis-command';
import type { TeamImportSubmit } from '../../shared/teams/team-import-dialog';

export type MatchupPreparationPhase =
  | 'idle'
  | 'creating'
  | 'reconciling'
  | 'starting-analysis'
  | 'accepted'
  | 'creation-error'
  | 'analysis-error';

export interface MatchupPreparationSnapshot {
  phase: MatchupPreparationPhase;
  teamId: string | null;
  matchupId: string | null;
  opponentId: string | null;
  runId: string | null;
  creationError: string | null;
  analysisError: string | null;
  statusMessage: string | null;
  analysisRetryable: boolean;
}

interface ActiveCommand {
  teamId: string;
  matchupId: string;
  opponentId: string;
  idempotencyKey: string;
  requestBody: AnalysisStartRequest;
}

@Injectable({ providedIn: 'root' })
export class MatchupPreparation {
  private readonly store = inject(CoachStore);
  private readonly analysisApi = inject(AnalysisApi);
  private readonly router = inject(Router);
  private readonly locale = inject(LocaleService);

  private readonly phase = signal<MatchupPreparationPhase>('idle');
  private readonly teamId = signal<string | null>(null);
  private readonly matchupId = signal<string | null>(null);
  private readonly opponentId = signal<string | null>(null);
  private readonly runId = signal<string | null>(null);
  private readonly creationError = signal<string | null>(null);
  private readonly analysisError = signal<string | null>(null);
  private readonly analysisRetryable = signal(false);
  private readonly capabilitiesState = signal<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  private readonly capabilities = signal<AnalysisCapabilitiesView | null>(null);
  private readonly capabilitiesError = signal<string | null>(null);

  private activeCommand: ActiveCommand | null = null;
  private pendingIds: { matchupId: string; opponentId: string } | null = null;
  private chainSub: Subscription | null = null;
  private capabilitiesSub: Subscription | null = null;
  private navigationTeamId: string | null = null;

  readonly snapshot = computed<MatchupPreparationSnapshot>(() => {
    const phase = this.phase();
    let statusMessage: string | null = null;
    if (phase === 'creating' || phase === 'reconciling') {
      statusMessage = 'Enregistrement du matchup…';
    } else if (phase === 'starting-analysis') {
      statusMessage = 'Lancement de l’analyse…';
    }
    return {
      phase,
      teamId: this.teamId(),
      matchupId: this.matchupId(),
      opponentId: this.opponentId(),
      runId: this.runId(),
      creationError: this.creationError(),
      analysisError: this.analysisError(),
      statusMessage,
      analysisRetryable: this.analysisRetryable(),
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
      error: (err: unknown) => {
        this.capabilitiesState.set('error');
        this.capabilitiesError.set(analysisErrorMessage(err));
      },
    });
  }

  submit(teamId: string, payload: TeamImportSubmit): void {
    if (this.chainSub) {
      return;
    }
    this.resetErrors();
    this.navigationTeamId = teamId;
    this.teamId.set(teamId);
    if (!this.pendingIds) {
      this.pendingIds = {
        matchupId: crypto.randomUUID(),
        opponentId: crypto.randomUUID(),
      };
    }
    const ids = this.pendingIds;
    this.activeCommand = {
      teamId,
      matchupId: ids.matchupId,
      opponentId: ids.opponentId,
      idempotencyKey: crypto.randomUUID(),
      requestBody: {
        targetPhase: 'A',
        profile: 'standard',
        locale: this.locale.active(),
      },
    };
    this.matchupId.set(ids.matchupId);
    this.opponentId.set(ids.opponentId);
    this.phase.set('creating');

    this.chainSub = this.store
      .createOpponentMatchup(ids, teamId, payload.name, payload.imported)
      .subscribe({
        next: (summary) => this.finishCreatedMatchup(summary),
        error: (err) => this.handleCreationFailure(teamId, ids, err),
      });
  }

  retryAnalysis(matchupId: string): void {
    const cmd = this.activeCommand;
    if (!cmd || cmd.matchupId !== matchupId || this.chainSub) {
      return;
    }
    if (this.phase() !== 'analysis-error') {
      return;
    }
    this.resetAnalysisError();
    this.navigationTeamId = cmd.teamId;
    this.phase.set('starting-analysis');
    this.launchAnalysis(cmd);
  }

  resumePendingIfAny(): void {
    clearPendingAnalysisMarker();
  }

  dismissAnalysisError(): void {
    this.resetAnalysisError();
    this.phase.set('idle');
    this.activeCommand = null;
    this.pendingIds = null;
  }

  private finishCreatedMatchup(summary: MatchupSummary): void {
    const cmd = this.activeCommand;
    if (!cmd || summary.id !== cmd.matchupId) {
      return;
    }
    this.pendingIds = null;
    this.chainSub = null;
    this.store.appendMatchup(summary);
    this.store.loadMatchups(cmd.teamId);
    this.phase.set('accepted');
    if (this.navigationTeamId === cmd.teamId) {
      void this.router.navigate(['/teams', cmd.teamId, 'matchups', summary.id]);
    }
    queueMicrotask(() => {
      this.phase.set('idle');
      this.activeCommand = null;
    });
  }

  private launchAnalysis(cmd: ActiveCommand): void {
    writePendingAnalysisMarker({
      schemaVersion: 1,
      teamId: cmd.teamId,
      matchupId: cmd.matchupId,
      idempotencyKey: cmd.idempotencyKey,
      requestBody: cmd.requestBody,
    });

    this.chainSub?.unsubscribe();
    this.chainSub = this.analysisApi
      .start(cmd.matchupId, cmd.requestBody, cmd.idempotencyKey)
      .subscribe({
        next: (result) => {
          clearPendingAnalysisMarker();
          this.runId.set(result.runId);
          this.phase.set('accepted');
          this.chainSub = null;
          if (this.navigationTeamId === cmd.teamId) {
            void this.router.navigate(
              ['/teams', cmd.teamId, 'matchups', cmd.matchupId],
              { queryParams: { runId: result.runId } },
            );
          }
          this.phase.set('idle');
          this.activeCommand = null;
        },
        error: (err: unknown) => {
          this.chainSub = null;
          this.analysisRetryable.set(
            err instanceof AnalysisError ? err.retryable : true,
          );
          this.analysisError.set(analysisErrorMessage(err));
          this.phase.set('analysis-error');
        },
      });
  }

  private handleCreationFailure(
    teamId: string,
    ids: { matchupId: string; opponentId: string },
    err: unknown,
  ): void {
    this.creationError.set(userMessageForGraphqlError(err));
    this.phase.set('reconciling');
    this.chainSub?.unsubscribe();
    this.chainSub = this.store.reconcileMatchup(teamId, ids.matchupId).subscribe({
      next: (detail) => {
        this.chainSub = null;
        if (detail && detail.teamId === teamId) {
          this.finishCreatedMatchup({
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
        this.phase.set('creation-error');
      },
      error: () => {
        this.chainSub = null;
        this.phase.set('creation-error');
      },
    });
  }

  private resetErrors(): void {
    this.creationError.set(null);
    this.resetAnalysisError();
  }

  private resetAnalysisError(): void {
    this.analysisError.set(null);
    this.analysisRetryable.set(false);
  }

  /** Test helper */
  resetForTests(): void {
    this.chainSub?.unsubscribe();
    this.capabilitiesSub?.unsubscribe();
    this.chainSub = null;
    this.capabilitiesSub = null;
    this.phase.set('idle');
    this.teamId.set(null);
    this.matchupId.set(null);
    this.opponentId.set(null);
    this.runId.set(null);
    this.activeCommand = null;
    this.pendingIds = null;
    this.navigationTeamId = null;
    clearPendingAnalysisMarker();
  }
}
