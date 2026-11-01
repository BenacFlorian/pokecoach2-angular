import { Component, input } from '@angular/core';
import type { LeadRecommendation, SelectionResult } from '../../core/models/matchup.model';
import type { RefinementSectionV2 } from '../../core/models/simulation-result.model';
import type { PokemonSlot, Team } from '../../core/models/team.model';
import type { OpeningStudyDisplay } from '../../core/matchup/simulation-display';
import {
  formatActionPair,
  formatBattleAction,
  formatFrequencyLabel,
} from '../../core/matchup/battle-action-display';
import {
  formatPercent,
  formatOpponentLeadLabel,
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
  readonly opponentLeads = input<readonly import('../../core/models/matchup.model').OpponentLeadStats[] | null>(null);
  readonly recommendation = input<LeadRecommendation | null>(null);
  readonly selections = input<readonly SelectionResult[] | null>(null);
  readonly openings = input<readonly OpeningStudyDisplay[] | null>(null);
  readonly openingsPending = input(false);
  readonly provenanceNote = input<string | null>(null);
  readonly refinement = input<RefinementSectionV2 | null>(null);

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

  leadLabelForStudy(study: OpeningStudyDisplay): string {
    return formatOpponentLeadLabel(this.opponentTeam(), study.opponentLeadSlots);
  }

  leadMatchupAriaLabel(study: OpeningStudyDisplay): string {
    const ours = this.ourTeam();
    const opp = this.opponentTeam();
    const rec = this.recommendation();
    if (!rec) {
      return this.leadLabelForStudy(study);
    }
    const ourNames = rec.ourLeadSlots
      .map((s) => ours.pokemon[s]?.species ?? `slot ${s}`)
      .join(', ');
    const oppNames = study.opponentLeadSlots
      .map((s) => opp.pokemon[s]?.species ?? `slot ${s}`)
      .join(', ');
    return `Notre lead ${ourNames} contre ${oppNames}`;
  }

  leadLabel(leadId: string): string {
    const leads = this.opponentLeads();
    if (!leads) {
      return leadId;
    }
    return opponentLeadLabelById(this.opponentTeam(), leads, leadId);
  }

  previewPercent(count: number, sampleSize: number): string {
    return formatPercent(count, sampleSize);
  }

  formatOurPair(study: OpeningStudyDisplay, row: OpeningStudyDisplay['ourActions'][number]): string {
    return formatActionPair(row.value, this.ourTeam(), this.opponentTeam());
  }

  formatOppPair(study: OpeningStudyDisplay, row: OpeningStudyDisplay['opponentActions'][number]): string {
    return formatActionPair(row.value, this.ourTeam(), this.opponentTeam());
  }

  freqLabel = formatFrequencyLabel;

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
    const pair = value as [import('../../core/models/matchup.model').BattleAction, import('../../core/models/matchup.model').BattleAction];
    return `${formatBattleAction(pair[0], this.ourTeam(), this.opponentTeam())} ; ${formatBattleAction(pair[1], this.ourTeam(), this.opponentTeam())} (n=${count}/${sample})`;
  }
}
