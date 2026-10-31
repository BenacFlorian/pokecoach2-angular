import { Component, input } from '@angular/core';
import type {
  BattleAction,
  LeadRecommendation,
  OpponentLeadStats,
  SelectionResult,
} from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';
import {
  formatPercent,
  opponentLeadLabelById,
} from '../../core/matchup/matchup-display';
import { PokemonPortrait } from '../../shared/pokemon/pokemon-portrait';

@Component({
  selector: 'app-lead-pick',
  imports: [PokemonPortrait],
  templateUrl: './lead-pick.html',
})
export class LeadPick {
  readonly ourTeam = input.required<Team>();
  readonly opponentTeam = input.required<Team>();
  readonly opponentLeads = input.required<readonly OpponentLeadStats[]>();
  readonly recommendation = input.required<LeadRecommendation>();
  readonly selections = input.required<readonly SelectionResult[]>();
  readonly studiedLeadIds = input.required<readonly string[]>();

  winRate(result: SelectionResult): string | null {
    if (result.sampleSize === 0) {
      return null;
    }
    return formatPercent(result.wins, result.sampleSize);
  }

  leadLabel(leadId: string): string {
    return opponentLeadLabelById(
      this.opponentTeam(),
      this.opponentLeads(),
      leadId,
    );
  }

  isStudied(leadId: string): boolean {
    return this.recommendation().studiedLeads.some(
      (s) => s.opponentLeadId === leadId,
    );
  }

  formatAction(action: BattleAction): string {
    const ours = this.ourTeam();
    if (action.kind === 'switch') {
      return `${ours.pokemon[action.actor.slot].species} → ${ours.pokemon[action.switchTo.slot].species}`;
    }
    const actor = ours.pokemon[action.actor.slot].species;
    const opp = this.opponentTeam();
    const targets = action.targets
      .map((t) =>
        t.kind === 'zone' ? t.zone : opp.pokemon[t.ref.slot].species,
      )
      .join(', ');
    const tera = action.terastallize ? ` (Tera ${action.terastallize})` : '';
    return `${actor} : ${action.move} → ${targets}${tera}`;
  }
}
