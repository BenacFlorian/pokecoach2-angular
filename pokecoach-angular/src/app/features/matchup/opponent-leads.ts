import { Component, computed, input, output } from '@angular/core';
import type {
  BattleAction,
  Frequency,
  OpponentLeadStats,
  PokemonRef,
} from '../../core/models/matchup.model';
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
  readonly turn1Pending = input(false);

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

  readonly sortedJointActions = computed(() => {
    const lead = this.activeLead();
    if (!lead) {
      return [];
    }
    return [...lead.jointTurn1Actions].sort((a, b) => b.count - a.count);
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

  mon(team: Team, slot: PokemonRef['slot']) {
    return team.pokemon[slot];
  }

  formatAction(action: BattleAction): string {
    if (action.kind === 'switch') {
      const from = this.mon(this.opponentTeam(), action.actor.slot).species;
      const to = this.mon(this.opponentTeam(), action.switchTo.slot).species;
      return `${from} → ${to}`;
    }
    const actor = this.mon(this.opponentTeam(), action.actor.slot).species;
    const targets = action.targets
      .map((t) =>
        t.kind === 'zone' ? t.zone : this.mon(this.ourTeam(), t.ref.slot).species,
      )
      .join(', ');
    const tera = action.terastallize ? ` (Tera ${action.terastallize})` : '';
    return `${actor} : ${action.move} → ${targets}${tera}`;
  }

  formatJoint(joint: Frequency<readonly [BattleAction, BattleAction]>): string {
    return joint.value.map((a) => this.formatAction(a)).join(' · ');
  }
}
