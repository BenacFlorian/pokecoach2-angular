import { Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { OpponentLeadStats } from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';
import {
  createMoveTargetLabels,
  formatActionPair,
  formatFrequencyLabel,
} from '../../core/matchup/battle-action-display';
import type { OpeningStudyDisplay } from '../../core/matchup/simulation-display';
import { formatFrequencyPercent } from '../../core/matchup/matchup-display';
import { PokemonPortrait } from '../../shared/pokemon/pokemon-portrait';

@Component({
  selector: 'app-opening-study-panel',
  imports: [PokemonPortrait, TranslocoPipe],
  templateUrl: './opening-study-panel.html',
})
export class OpeningStudyPanel {
  private readonly transloco = inject(TranslocoService);
  private readonly moveLabels = computed(() =>
    createMoveTargetLabels((key) => this.transloco.translate(key)),
  );

  readonly ourTeam = input.required<Team>();
  readonly opponentTeam = input.required<Team>();
  readonly lead = input.required<OpponentLeadStats>();
  readonly study = input<OpeningStudyDisplay | null>(null);
  readonly openingsPending = input(false);
  readonly backsPending = input(false);

  readonly sortedBackPairs = computed(() =>
    [...(this.lead().backPairs ?? [])].sort((a, b) => b.count - a.count),
  );

  readonly sortedBackMarginals = computed(() =>
    [...(this.lead().backSlotMarginals ?? [])].sort((a, b) => b.count - a.count),
  );

  freqLabel = formatFrequencyLabel;
  freqPercent = formatFrequencyPercent;

  mon(team: Team, slot: number) {
    return team.pokemon[slot];
  }

  formatOurPair(row: OpeningStudyDisplay['ourActions'][number]): string {
    return formatActionPair(
      row.value,
      this.ourTeam(),
      this.opponentTeam(),
      this.moveLabels(),
    );
  }

  formatOppPair(row: OpeningStudyDisplay['opponentActions'][number]): string {
    return formatActionPair(
      row.value,
      this.ourTeam(),
      this.opponentTeam(),
      this.moveLabels(),
    );
  }
}
