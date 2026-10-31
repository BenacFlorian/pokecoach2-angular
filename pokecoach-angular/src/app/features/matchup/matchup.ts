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
} from '../../core/graphql/coach-mappers';
import type { RunResult } from '../../core/graphql/coach-mappers';
import { GameplanTab } from './gameplan';
import { LeadPick } from './lead-pick';
import { OpponentLeads } from './opponent-leads';
import { TeamStrip } from '../../shared/teams/team-strip';

type MatchupTab = 'opponent-leads' | 'lead-pick' | 'gameplan';

@Component({
  selector: 'app-matchup',
  imports: [RouterLink, TeamStrip, OpponentLeads, LeadPick, GameplanTab],
  templateUrl: './matchup.html',
})
export class Matchup {
  readonly teamId = input.required<string>();
  readonly matchupId = input.required<string>();
  readonly runId = input<string>();

  readonly store = inject(CoachStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<MatchupTab>('opponent-leads');
  readonly selectedLeadId = signal<string>('');

  readonly tabOrder: MatchupTab[] = ['opponent-leads', 'lead-pick', 'gameplan'];

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastLoadedKey = '';

  constructor() {
    effect(() => {
      const teamId = this.teamId();
      const matchupId = this.matchupId();
      const key = `${teamId}:${matchupId}`;
      if (key !== this.lastLoadedKey) {
        this.lastLoadedKey = key;
        this.activeTab.set('opponent-leads');
        this.selectedLeadId.set('');
      }
      this.store.loadMatchup(teamId, matchupId);
    });

    effect(() => {
      this.store.matchupDetail();
      this.store.matchupDetailState();
      this.syncPolling();
    });

    effect(() => {
      const result = this.runResult();
      if (!result) {
        return;
      }
      const sorted = [...result.report.opponentLeads].sort(
        (a, b) => b.phaseACount - a.phaseACount,
      );
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
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopPolling();
      return;
    }
    const teamId = this.teamId();
    const matchupId = this.matchupId();
    this.store.refreshMatchup(teamId, matchupId);
    this.syncPolling();
  };

  detail() {
    return this.store.matchupDetail();
  }

  runResult(): RunResult | null {
    const detail = this.store.matchupDetail();
    if (!detail || detail.successfulResult.kind !== 'valid') {
      return null;
    }
    return detail.successfulResult.result;
  }

  bannerOurTeam() {
    const result = this.runResult();
    const detail = this.store.matchupDetail();
    return result?.ourTeamSnapshot ?? detail?.ourTeam ?? null;
  }

  bannerOpponentTeam() {
    const result = this.runResult();
    const detail = this.store.matchupDetail();
    return result?.opponentTeamSnapshot ?? detail?.opponentTeam ?? null;
  }

  latestRunMessage(): string | null {
    const detail = this.store.matchupDetail();
    if (!detail) {
      return null;
    }
    const run = this.selectedRun();
    if (this.runIdMismatch()) {
      return 'Run introuvable pour ce matchup.';
    }
    if (this.runResult() && run) {
      const active = activeRunStatusMessage(run);
      if (active) {
        return active;
      }
    }
    if (!run) {
      return 'Matchup enregistré — aucune analyse disponible';
    }
    return activeRunStatusMessage(run);
  }

  incompatibleMessage(): string | null {
    const detail = this.store.matchupDetail();
    if (!detail || detail.successfulResult.kind !== 'incompatible') {
      return null;
    }
    return detail.successfulResult.message;
  }

  provenanceLabel(): string | null {
    const result = this.runResult();
    return reportProvenanceLabel(result?.summary.source ?? null);
  }

  refresh(): void {
    this.store.refreshMatchup(this.teamId(), this.matchupId());
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

  studiedLeadIds(): string[] {
    return (
      this.runResult()?.report.leadRecommendation.studiedLeads.map(
        (s) => s.opponentLeadId,
      ) ?? []
    );
  }

  private syncPolling(): void {
    this.stopPolling();
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }
    const detail = this.store.matchupDetail();
    const run = this.selectedRun();
    if (!detail || !shouldPollRun(run)) {
      return;
    }
    const teamId = this.teamId();
    const matchupId = this.matchupId();
    this.pollTimer = setInterval(() => {
      this.store.refreshMatchup(teamId, matchupId);
    }, 5000);
  }

  selectedRun() {
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

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
