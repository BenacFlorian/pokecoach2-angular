import { Component, input } from '@angular/core';
import type {
  BattleAction,
  LeadRecommendation,
  OpponentLeadStats,
  SelectionResult,
} from '../../core/models/matchup.model';
import type { PokemonSlot, Team } from '../../core/models/team.model';
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
  readonly opponentLeads = input<readonly OpponentLeadStats[] | null>(null);
  readonly recommendation = input<LeadRecommendation | null>(null);
  readonly selections = input<readonly SelectionResult[] | null>(null);
  readonly studiedLeadIds = input.required<readonly string[]>();
  readonly provenanceNote = input<string | null>(null);

  /** Lead pair first, then back pair (stable slot order within each group). */
  displayFourSlots(rec: LeadRecommendation): readonly PokemonSlot[] {
    const four = rec.ourFourSlots;
    const [leadA, leadB] = rec.ourLeadSlots;
    const leadSet = new Set<PokemonSlot>([leadA, leadB]);
    const backs = four.filter((s) => !leadSet.has(s)).sort((a, b) => a - b);
    return [leadA, leadB, ...backs];
  }

  winRate(result: SelectionResult): string | null {
    if (result.sampleSize === 0) {
      return null;
    }
    return formatPercent(result.wins, result.sampleSize);
  }

  leadLabel(leadId: string): string {
    const leads = this.opponentLeads();
    if (!leads) {
      return leadId;
    }
    return opponentLeadLabelById(
      this.opponentTeam(),
      leads,
      leadId,
    );
  }

  isStudied(leadId: string): boolean {
    const rec = this.recommendation();
    if (!rec) {
      return false;
    }
    return rec.studiedLeads.some(
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
