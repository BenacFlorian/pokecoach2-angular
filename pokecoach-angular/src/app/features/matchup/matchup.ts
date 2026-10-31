import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoachStore } from '../../core/data/coach-store';
import {
  activeRunStatusMessage,
  reportProvenanceLabel,
  shouldPollRun,
  type RunResult,
  type SelectedRunView,
} from '../../core/graphql/coach-mappers';
import type {
  GameplanReport,
  LeadRecommendation,
  OpponentLeadStats,
  SelectionResult,
} from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';
import type { AnalysisCapabilitiesView } from '../../core/python/analysis-api.models';
import { AnalysisApi } from '../../core/python/analysis-api';
import { AnalysisControls } from './analysis-controls';
import { GameplanTab } from './gameplan';
import { LeadPick } from './lead-pick';
import { OpponentLeads } from './opponent-leads';
import { TeamStrip } from '../../shared/teams/team-strip';

type MatchupTab = 'opponent-leads' | 'lead-pick' | 'gameplan';

@Component({
  selector: 'app-matchup',
  imports: [RouterLink, TeamStrip, OpponentLeads, LeadPick, GameplanTab, AnalysisControls],
  templateUrl: './matchup.html',
})
export class Matchup {
  readonly teamId = input.required<string>();
  readonly matchupId = input.required<string>();
  readonly runId = input<string>();

  readonly store = inject(CoachStore);
  private readonly analysisApi = inject(AnalysisApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly capabilities = signal<AnalysisCapabilitiesView | null>(null);

  readonly activeTab = signal<MatchupTab>('opponent-leads');
  readonly selectedLeadId = signal<string>('');

  readonly tabOrder: MatchupTab[] = ['opponent-leads', 'lead-pick', 'gameplan'];

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
        this.activeTab.set('opponent-leads');
        this.selectedLeadId.set('');
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

    effect(() => {
      const leads = this.opponentLeadsForTabs();
      if (!leads?.length) {
        return;
      }
      const sorted = [...leads].sort((a, b) => b.phaseACount - a.phaseACount);
      const current = this.selectedLeadId();
      if (!current || !sorted.some((l) => l.id === current)) {
        this.selectedLeadId.set(sorted[0]?.id ?? '');
      }
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

  detail() {
    return this.store.matchupDetail();
  }

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

  showTabs(): boolean {
    const view = this.selectedRunView();
    if (view?.kind === 'mock' || view?.kind === 'simulation') {
      return true;
    }
    return this.runResult() !== null;
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

  opponentLeadsForTabs(): readonly OpponentLeadStats[] | null | undefined {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.opponentLeads;
    }
    const result = this.runResult();
    return result?.report.opponentLeads;
  }

  turn1Pending(): boolean {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.turn1Pending;
    }
    return false;
  }

  leadRecommendationForTab(): LeadRecommendation | null {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.leadRecommendation;
    }
    return this.runResult()?.report.leadRecommendation ?? null;
  }

  selectionsForTab(): readonly SelectionResult[] | null {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.selectionComparisons;
    }
    return this.runResult()?.report.selectionComparisons ?? null;
  }

  refinementForTab(): import('../../core/models/simulation-result.model').RefinementSectionV2 | null {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.refinement;
    }
    return null;
  }

  gameplanForTab(): GameplanReport | null {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return view.view.tabDisplay.gameplan;
    }
    return this.runResult()?.report.gameplan ?? null;
  }

  studiedLeadIds(): string[] {
    const view = this.selectedRunView();
    if (view?.kind === 'simulation') {
      return [...view.view.tabDisplay.studiedLeadIds];
    }
    return (
      this.runResult()?.report.leadRecommendation.studiedLeads.map(
        (s) => s.opponentLeadId,
      ) ?? []
    );
  }

  progressHint(): string | null {
    const view = this.selectedRunView();
    if (view?.kind !== 'simulation') {
      return null;
    }
    const { progress, partialResult, resultRevision, targetPhase } = view.view;
    const phases = partialResult.completedPhases.join(', ') || '—';
    const partial =
      partialResult.completedPhases.length < 5 ? ' (partiel)' : '';
    let line = `Phases : ${phases}${partial} · révision ${resultRevision}`;
    if (targetPhase) {
      line += ` · cible ${targetPhase}`;
    }
    if (progress) {
      line += ` · ${progress.phase} ${progress.completed}/${progress.total}`;
    }
    return line;
  }

  latestRunMessage(): string | null {
    const detail = this.store.matchupDetail();
    if (!detail) {
      return null;
    }
    const run = this.selectedRunSummary();
    if (this.runIdMismatch()) {
      return 'Run introuvable pour ce matchup.';
    }
    const view = this.selectedRunView();
    if (view?.kind === 'incompatible') {
      return view.message;
    }
    if (!run) {
      return 'Matchup enregistré — aucune analyse disponible';
    }
    return activeRunStatusMessage(run);
  }

  incompatibleMessage(): string | null {
    const detail = this.store.matchupDetail();
    if (!detail) {
      return null;
    }
    if (!this.runId()?.trim() && detail.successfulResult.kind === 'incompatible') {
      return detail.successfulResult.message;
    }
    const view = this.selectedRunView();
    if (view?.kind === 'incompatible') {
      return view.message;
    }
    return null;
  }

  provenanceLabel(): string | null {
    const view = this.selectedRunView();
    if (view?.kind === 'mock') {
      return reportProvenanceLabel(view.result.summary.source);
    }
    if (view?.kind === 'simulation') {
      return reportProvenanceLabel(view.view.summary.source);
    }
    return reportProvenanceLabel(this.runResult()?.summary.source ?? null);
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

  setTab(tab: MatchupTab, event?: Event): void {
    this.activeTab.set(tab);
    if (event && event.target instanceof HTMLElement) {
      event.target.focus();
    }
  }

  onTabKeydown(event: KeyboardEvent, tabs: MatchupTab[]): void {
    const current = this.activeTab();
    const index = tabs.indexOf(current);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.activeTab.set(tabs[(index + 1) % tabs.length]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.activeTab.set(tabs[(index - 1 + tabs.length) % tabs.length]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.activeTab.set(tabs[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.activeTab.set(tabs[tabs.length - 1]);
    }
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
