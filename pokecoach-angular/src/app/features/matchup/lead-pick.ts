import { Component, input } from '@angular/core';
import type {
  BattleAction,
  LeadRecommendation,
  OpponentLeadStats,
  SelectionResult,
} from '../../core/models/matchup.model';
import type { RefinementSectionV2 } from '../../core/models/simulation-result.model';
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
  readonly refinement = input<RefinementSectionV2 | null>(null);

  /** Lead pair first, then back pair (stable slot order within each group). */
  private orderFourLeadsFirst(
    four: readonly [number, number, number, number],
    lead: readonly [number, number],
  ): readonly [PokemonSlot, PokemonSlot, PokemonSlot, PokemonSlot] {
    const leadA = lead[0] as PokemonSlot;
    const leadB = lead[1] as PokemonSlot;
    const leadSet = new Set<PokemonSlot>([leadA, leadB]);
    const backs = (four as readonly PokemonSlot[])
      .filter((s): s is PokemonSlot => !leadSet.has(s))
      .sort((a, b) => a - b);
    return [leadA, leadB, backs[0], backs[1]];
  }

  displayFourSlots(rec: LeadRecommendation): readonly PokemonSlot[] {
    return this.orderFourLeadsFirst(rec.ourFourSlots, rec.ourLeadSlots);
  }

  displayRefinementFour(ref: RefinementSectionV2): readonly PokemonSlot[] {
    return this.orderFourLeadsFirst(
      ref.configuration.ourFourSlots,
      ref.configuration.ourLeadSlots,
    );
  }

  winRate(result: SelectionResult): string | null {
    if (result.sampleSize === 0) {
      return null;
    }
    return formatPercent(result.wins, result.sampleSize);
  }

  refinementOutcomeLabel(ref: RefinementSectionV2): string {
    const { wins, losses, draws } = ref.outcomes;
    return `${wins} V / ${losses} D / ${draws} N (${ref.sampleSize} combats)`;
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

  formatRefinementTurnRow(row: unknown): string | null {
    if (typeof row !== 'object' || row === null) {
      return null;
    }
    const obj = row as Record<string, unknown>;
    const count = typeof obj['count'] === 'number' ? obj['count'] : 0;
    const sample = typeof obj['sampleSize'] === 'number' ? obj['sampleSize'] : 0;
    const value = obj['value'];
    if (!Array.isArray(value) || value.length !== 2) {
      return null;
    }
    const a = value[0] as BattleAction;
    const b = value[1] as BattleAction;
    return `${this.formatAction(a)} ; ${this.formatAction(b)} (n=${count}/${sample})`;
  }
}
