import { Component, computed, effect, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { OpponentLeadStats } from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';
import type { OpeningStudyDisplay } from '../../core/matchup/simulation-display';
import {
  formatOpponentLeadLabel,
  formatPercent,
} from '../../core/matchup/matchup-display';
import { OpeningStudyPanel } from './opening-study-panel';
import { PokemonPortrait } from '../../shared/pokemon/pokemon-portrait';

@Component({
  selector: 'app-matchup-right-column',
  imports: [OpeningStudyPanel, PokemonPortrait, TranslocoPipe],
  templateUrl: './matchup-right-column.html',
})
export class MatchupRightColumn {
  readonly contextKey = input.required<string>();
  readonly ourTeam = input.required<Team>();
  readonly opponentTeam = input.required<Team>();
  readonly leads = input<readonly OpponentLeadStats[] | null>(null);
  readonly openings = input<readonly OpeningStudyDisplay[] | null>(null);
  readonly openingsPending = input(false);
  readonly backsPending = input(false);

  readonly expandedLeadId = signal<string | null>(null);
  private lastContextKey = '';

  readonly sortedLeads = computed(() => {
    const list = this.leads();
    if (!list?.length) {
      return [];
    }
    return [...list].sort((a, b) => {
      if (b.phaseACount !== a.phaseACount) {
        return b.phaseACount - a.phaseACount;
      }
      return a.id.localeCompare(b.id);
    });
  });

  readonly studyByLeadId = computed(() => {
    const map = new Map<string, OpeningStudyDisplay>();
    for (const study of this.openings() ?? []) {
      map.set(study.opponentLeadId, study);
    }
    return map;
  });

  constructor() {
    effect(() => {
      const key = this.contextKey();
      if (key !== this.lastContextKey) {
        this.lastContextKey = key;
        this.expandedLeadId.set(null);
      }
      const expanded = this.expandedLeadId();
      if (expanded && !this.leads()?.some((l) => l.id === expanded)) {
        this.expandedLeadId.set(null);
      }
    });
  }

  leadLabel(lead: OpponentLeadStats): string {
    return formatOpponentLeadLabel(this.opponentTeam(), lead.leadSlots);
  }

  previewPercent(lead: OpponentLeadStats): string {
    return formatPercent(lead.phaseACount, lead.phaseASampleSize);
  }

  toggleLead(id: string): void {
    const current = this.expandedLeadId();
    this.expandedLeadId.set(current === id ? null : id);
  }

  onLeadKeydown(event: KeyboardEvent, id: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleLead(id);
    }
  }

  studyFor(leadId: string): OpeningStudyDisplay | null {
    return this.studyByLeadId().get(leadId) ?? null;
  }

  panelId(leadId: string): string {
    return `matchup-lead-panel-${leadId}`;
  }

  mon(team: Team, slot: number) {
    return team.pokemon[slot];
  }
}
