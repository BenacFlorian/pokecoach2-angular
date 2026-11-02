import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoachStore } from '../../core/data/coach-store';
import {
  activeRunStatusMessage,
  formatAnalysisProgressMessage,
  shouldPollRun,
  type RunProgress,
  type RunResult,
  type RunStatusI18n,
  type SelectedRunView,
} from '../../core/graphql/coach-mappers';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type {
  GameplanReport,
  LeadRecommendation,
  OpponentLeadStats,
} from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';
import type { RefinementSectionV2 } from '../../core/models/simulation-result.model';
import {
  buildSelectionDetails,
  leadPickSectionFromSimulation,
} from '../../core/matchup/selection-details-display';
import type { OpeningStudyDisplay } from '../../core/matchup/simulation-display';
import { type AnalysisCapabilitiesView } from '../../core/python/analysis-api.models';
import { AnalysisApi } from '../../core/python/analysis-api';
import { AnalysisControls } from './analysis-controls';
import { MatchupLeftColumn } from './matchup-left-column';
import { MatchupRightColumn } from './matchup-right-column';
import { TeamStrip } from '../../shared/teams/team-strip';

@Component({
  selector: 'app-matchup',
  imports: [
    RouterLink,
    TeamStrip,
    MatchupLeftColumn,
    MatchupRightColumn,
    AnalysisControls,
    TranslocoPipe,
  ],
  templateUrl: './matchup.html',
})
export class Matchup {
  readonly teamId = input.required<string>();
  readonly matchupId = input.required<string>();
  readonly runId = input<string>();

  readonly store = inject(CoachStore);
  private readonly analysisApi = inject(AnalysisApi);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly capabilities = signal<AnalysisCapabilitiesView | null>(null);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastLoadedKey = '';
  private lastRunKey = '';

  constructor() {
    effect(() => {
      const teamId = this.teamId();
      const matchupId = this.matchupId();
      const key = `${teamId}:${matchupId}`;
      if (key !== this.lastLoadedKey) {
        this.lastLoadedKey = key;
        this.lastRunKey = '';
      }
      this.store.loadMatchup(teamId, matchupId);
    });

    effect(() => {
      const teamId = this.teamId();
      const matchupId = this.matchupId();
      const detail = this.store.matchupDetail();
      if (!detail) {
        return;
      }
      const run = this.selectedRunSummary();
      if (!run) {
        return;
      }
      const runKey = `${teamId}:${matchupId}:${run.id}`;
      if (runKey === this.lastRunKey) {
        return;
      }
      this.lastRunKey = runKey;
      this.store.loadRun(teamId, matchupId, run.id);
    });

    effect(() => {
      this.store.matchupDetail();
      this.store.selectedRun();
      this.syncPolling();
    });

    this.destroyRef.onDestroy(() => this.stopPolling());

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.destroyRef.onDestroy(() =>
        document.removeEventListener('visibilitychange', this.onVisibilityChange),
      );
    }

    this.analysisApi.capabilities().subscribe({
      next: (view) => this.capabilities.set(view),
      error: () => this.capabilities.set(null),
    });
  }

  readonly contextKey = computed(() => {
    const teamId = this.teamId();
    const matchupId = this.matchupId();
    const run = this.selectedRunSummary();
    return `${teamId}:${matchupId}:${run?.id ?? 'none'}`;
  });

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopPolling();
      return;
    }
    const teamId = this.teamId();
    const matchupId = this.matchupId();
    this.store.refreshMatchup(teamId, matchupId);
    const run = this.selectedRunSummary();
    if (run) {
      this.store.refreshRun(teamId, matchupId, run.id);
    }
    this.syncPolling();
  };

  selectedRunView(): SelectedRunView | null {
    const state = this.store.selectedRunState();
    if (state === 'idle' || state === 'loading') {
      return null;
    }
    const run = this.selectedRunSummary();
    const view = this.store.selectedRun();
    if (!run) {
      return null;
    }
    if (view && view.kind !== 'absent') {
      const viewRunId = this.runIdFromSelectedView(view);
      if (viewRunId !== null && viewRunId !== run.id) {
        return null;
      }
    }
    return view;
  }

  private runIdFromSelectedView(view: SelectedRunView): string | null {
    switch (view.kind) {
      case 'mock':
        return view.result.summary.id;
      case 'simulation':
        return view.view.summary.id;
      case 'incompatible':
        return view.summary?.id ?? null;
      case 'absent':
        return null;
    }
  }

  runResult(): RunResult | null {
    const view = this.selectedRunView();
    if (view?.kind === 'mock') {
      return view.result;
    }
    const detail = this.store.matchupDetail();
    if (!this.runId()?.trim() && detail?.successfulResult.kind === 'valid') {
      return detail.successfulResult.result;
    }
    return null;
  }

  runContentAvailable(): boolean {
    const view = this.selectedRunView();
    if (view?.kind === 'mock' || view?.kind === 'simulation') {
      return true;
    }
    return this.runResult() !== null;
  }

  showLeadColumns(): boolean {
    const leads = this.opponentLeadsForView();
    return Boolean(leads?.length);
  }

  bannerOurTeam(): Team | null {
    const view = this.selectedRunView();
    if (view?.kind === 'mock') {
      return view.result.ourTeamSnapshot;
    }
    if (view?.kind === 'simulation') {
      return view.view.ourTeamSnapshot;
    }
    const result = this.runResult();
    const detail = this.store.matchupDetail();
    return result?.ourTeamSnapshot ?? detail?.ourTeam ?? null;
  }

  bannerOpponentTeam(): Team | null {
    const view = this.selectedRunView();
    if (view?.kind === 'mock') {
      return view.result.opponentTeamSnapshot;
    }
    if (view?.kind === 'simulation') {
      return view.view.opponentTeamSnapshot;
    }
    const result = this.runResult();
    const detail = this.store.matchupDetail();
    return result?.opponentTeamSnapshot ?? detail?.opponentTeam ?? null;
  }

  opponentLeadsForView(): readonly OpponentLeadStats[] | null | undefined {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.opponentLeads;
    }
    const result = this.runResult();
    return result?.report.opponentLeads;
  }

  backsPending(): boolean {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.backsPending;
    }
    return false;
  }

  openingsForView(): readonly OpeningStudyDisplay[] | null {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.openings;
    }
    return null;
  }

  openingsPendingForView(): boolean {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.openingsPending;
    }
    return false;
  }

  leadRecommendationForView(): LeadRecommendation | null {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.leadRecommendation;
    }
    return this.runResult()?.report.leadRecommendation ?? null;
  }

  selectionDetailsForView() {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      const partial = view.view.partialResult;
      const section = leadPickSectionFromSimulation(partial);
      return buildSelectionDetails(
        section,
        view.view.tabDisplay.leadRecommendation,
        view.view.tabDisplay.selectionComparisons,
      );
    }
    const result = this.runResult();
    if (!result) {
      return null;
    }
    return buildSelectionDetails(
      null,
      result.report.leadRecommendation,
      result.report.selectionComparisons,
    );
  }

  refinementForView(): RefinementSectionV2 | null {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.refinement;
    }
    return null;
  }

  gameplanForView(): GameplanReport | null {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.gameplan;
    }
    return this.runResult()?.report.gameplan ?? null;
  }

  gameplanGenerating(): boolean {
    const run = this.selectedRunSummary();
    if (!run || run.status !== 'running') {
      return false;
    }
    if (run.targetPhase === 'synthesis') {
      return true;
    }
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.targetPhase === 'synthesis';
    }
    return false;
  }

  synthesisUnavailableForView(): boolean {
    if (this.gameplanForView() || this.gameplanGenerating()) {
      return false;
    }
    const caps = this.capabilities();
    if (caps?.synthesisAvailable) {
      return false;
    }
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      const phases = view.view.partialResult.completedPhases;
      return phases.includes('D') && !phases.includes('synthesis');
    }
    return false;
  }

  progressHint(): string | null {
    const run = this.selectedRunSummary();
    if (!run) {
      return null;
    }
    const view = this.selectedRunView();
    let progress: RunProgress | null = run.progress;
    let completedPhases: readonly string[] | undefined;
    let resultRevision: number | undefined;
    let targetPhase = run.targetPhase;

    if (view?.kind === 'simulation') {
      progress = view.view.progress ?? progress;
      completedPhases = view.view.partialResult.completedPhases;
      resultRevision = view.view.resultRevision;
      targetPhase = view.view.targetPhase ?? targetPhase;
    }

    return formatAnalysisProgressMessage({
      run,
      progress,
      completedPhases,
      resultRevision,
      targetPhase,
      phaseLabel: (phase) => this.transloco.translate(`phases.${phase}`),
    });
  }

  analysisProgressBar(): RunProgress | null {
    const run = this.selectedRunSummary();
    if (!run || (run.status !== 'queued' && run.status !== 'running')) {
      return null;
    }
    const view = this.selectedRunView();
    const progress =
      view?.kind === 'simulation'
        ? (view.view.progress ?? run.progress)
        : run.progress;
    if (!progress || progress.total <= 0) {
      return null;
    }
    return progress;
  }

  runStatusMessage(): RunStatusI18n | null {
    const detail = this.store.matchupDetail();
    if (!detail) {
      return null;
    }
    const run = this.selectedRunSummary();
    if (this.runIdMismatch()) {
      return { key: 'runStatus.runMissing' };
    }
    const view = this.selectedRunView();
    if (view?.kind === 'incompatible') {
      return null;
    }
    if (!run) {
      return { key: 'runStatus.none' };
    }
    return activeRunStatusMessage(run);
  }

  incompatibleMessage(): string | null {
    const view = this.selectedRunView();
    if (view?.kind === 'incompatible') {
      return view.message;
    }
    if (this.runContentAvailable()) {
      return null;
    }
    const detail = this.store.matchupDetail();
    if (!detail) {
      return null;
    }
    if (!this.runId()?.trim() && detail.successfulResult.kind === 'incompatible') {
      return detail.successfulResult.message;
    }
    return null;
  }

  refresh(): void {
    const teamId = this.teamId();
    const matchupId = this.matchupId();
    this.store.refreshMatchup(teamId, matchupId);
    const run = this.selectedRunSummary();
    if (run) {
      this.store.refreshRun(teamId, matchupId, run.id);
    }
    this.syncPolling();
  }

  private syncPolling(): void {
    this.stopPolling();
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }
    const run = this.selectedRunSummary();
    if (!shouldPollRun(run)) {
      return;
    }
    const teamId = this.teamId();
    const matchupId = this.matchupId();
    if (!run) {
      return;
    }
    this.pollTimer = setInterval(() => {
      this.store.refreshRun(teamId, matchupId, run.id);
      this.store.refreshMatchup(teamId, matchupId);
    }, 5000);
  }

  selectedRunSummary() {
    const detail = this.store.matchupDetail();
    if (!detail) {
      return null;
    }
    const param = this.runId()?.trim();
    if (param) {
      return detail.runs.find((r) => r.id === param) ?? null;
    }
    return detail.latestRun;
  }

  onRunStarted(runId: string): void {
    const teamId = this.teamId();
    const matchupId = this.matchupId();
    this.store.refreshMatchup(teamId, matchupId);
    this.store.loadRun(teamId, matchupId, runId);
    this.syncPolling();
  }

  runIdMismatch(): boolean {
    const param = this.runId()?.trim();
    if (!param) {
      return false;
    }
    const detail = this.store.matchupDetail();
    if (!detail || detail.runs.length === 0) {
      return false;
    }
    return !detail.runs.some((r) => r.id === param);
  }

  initialPageLoading(): boolean {
    return (
      this.store.matchupDetailState() === 'loading' &&
      this.store.matchupDetail() === null
    );
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
