import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoachStore } from '../../core/data/coach-store';
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

  private readonly store = inject(CoachStore);

  readonly activeTab = signal<MatchupTab>('opponent-leads');
  readonly selectedLeadId = signal<string>('');

  readonly tabOrder: MatchupTab[] = ['opponent-leads', 'lead-pick', 'gameplan'];

  readonly prepared = () =>
    this.store.getMatchup(this.teamId(), this.matchupId());

  readonly ourTeam = () => this.store.getTeam(this.teamId());

  constructor() {
    effect(() => {
      const m = this.prepared();
      if (!m) {
        this.selectedLeadId.set('');
        return;
      }
      this.activeTab.set('opponent-leads');
      const sorted = [...m.report.opponentLeads].sort(
        (a, b) => b.phaseACount - a.phaseACount,
      );
      this.selectedLeadId.set(sorted[0]?.id ?? '');
    });
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
      this.prepared()?.report.leadRecommendation.studiedLeads.map(
        (s) => s.opponentLeadId,
      ) ?? []
    );
  }
}
