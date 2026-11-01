import { Component, computed, input, output } from '@angular/core';
import type { OpponentLeadStats } from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';
import {
  formatFrequencyPercent,
  formatOpponentLeadLabel,
  formatPercent,
} from '../../core/matchup/matchup-display';
import { PokemonPortrait } from '../../shared/pokemon/pokemon-portrait';

@Component({
  selector: 'app-opponent-leads',
  imports: [PokemonPortrait],
  templateUrl: './opponent-leads.html',
})
export class OpponentLeads {
  readonly ourTeam = input.required<Team>();
  readonly opponentTeam = input.required<Team>();
  readonly leads = input<readonly OpponentLeadStats[] | null>(null);
  readonly backsPending = input(false);

  readonly selectedLeadId = input.required<string>();
  readonly selectedLeadIdChange = output<string>();

  readonly sortedLeads = computed(() => {
    const list = this.leads();
    if (!list) {
      return [];
    }
    return [...list].sort((a, b) => {
      if (b.phaseACount !== a.phaseACount) {
        return b.phaseACount - a.phaseACount;
      }
      return a.id.localeCompare(b.id);
    });
  });

  readonly activeLead = computed(() => {
    const list = this.leads();
    if (!list) {
      return undefined;
    }
    return list.find((l) => l.id === this.selectedLeadId());
  });

  readonly sortedBackPairs = computed(() => {
    const lead = this.activeLead();
    if (!lead) {
      return [];
    }
    return [...lead.backPairs].sort((a, b) => b.count - a.count);
  });

  readonly sortedBackMarginals = computed(() => {
    const lead = this.activeLead();
    if (!lead) {
      return [];
    }
    return [...lead.backSlotMarginals].sort((a, b) => b.count - a.count);
  });

  selectLead(id: string): void {
    this.selectedLeadIdChange.emit(id);
  }

  leadLabel(lead: OpponentLeadStats): string {
    return formatOpponentLeadLabel(this.opponentTeam(), lead.leadSlots);
  }

  percent = formatPercent;
  freqPercent = formatFrequencyPercent;

  mon(team: Team, slot: number) {
    return team.pokemon[slot];
  }
}
