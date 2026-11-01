import {
  Component,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { GameplanReport, LeadRecommendation } from '../../core/models/matchup.model';
import type { RefinementSectionV2 } from '../../core/models/simulation-result.model';
import type { Team } from '../../core/models/team.model';
import type { SelectionDetailsDisplay } from '../../core/matchup/selection-details-display';
import { displayFourSlots } from '../../core/matchup/selection-display';
import { formatPercent } from '../../core/matchup/matchup-display';
import { GameplanTab } from './gameplan';
import { RefinementScenariosModal } from './refinement-scenarios-modal';
import { SelectionDetailModal } from './selection-detail-modal';
import { PokemonPortrait } from '../../shared/pokemon/pokemon-portrait';

@Component({
  selector: 'app-matchup-left-column',
  imports: [
    PokemonPortrait,
    GameplanTab,
    RefinementScenariosModal,
    SelectionDetailModal,
    TranslocoPipe,
  ],
  templateUrl: './matchup-left-column.html',
})
export class MatchupLeftColumn {
  private readonly transloco = inject(TranslocoService);

  readonly contextKey = input.required<string>();
  readonly ourTeam = input.required<Team>();
  readonly opponentTeam = input.required<Team>();
  readonly opponentLeads = input<readonly import('../../core/models/matchup.model').OpponentLeadStats[] | null>(
    null,
  );
  readonly recommendation = input<LeadRecommendation | null>(null);
  readonly selectionDetails = input<SelectionDetailsDisplay | null>(null);
  readonly refinement = input<RefinementSectionV2 | null>(null);
  readonly gameplan = input<GameplanReport | null>(null);

  readonly scenariosModal = viewChild(RefinementScenariosModal);
  readonly selectionModal = viewChild(SelectionDetailModal);

  private lastContextKey = '';

  constructor() {
    effect(() => {
      const key = this.contextKey();
      if (key !== this.lastContextKey) {
        this.lastContextKey = key;
        this.scenariosModal()?.close();
        this.selectionModal()?.close();
      }
      if (!this.refinement()) {
        this.scenariosModal()?.close();
      }
      if (!this.selectionDetails()) {
        this.selectionModal()?.close();
      }
    });
  }

  displayFourSlots(rec: LeadRecommendation) {
    return displayFourSlots(rec);
  }

  refinementSummaryLabel(ref: RefinementSectionV2): string {
    const { wins, losses, draws } = ref.outcomes;
    return this.transloco.translate('leadPick.refinementGlobalOutcomes', {
      sample: ref.sampleSize,
      wins,
      losses,
      draws,
    });
  }

  refinementWinRate(ref: RefinementSectionV2): string {
    return formatPercent(ref.outcomes.wins, ref.sampleSize);
  }

  openScenarios(event: Event): void {
    const btn = event.currentTarget;
    if (!(btn instanceof HTMLElement)) {
      return;
    }
    this.selectionModal()?.close();
    this.scenariosModal()?.open(btn);
  }

  openSelectionDetails(event: Event): void {
    const btn = event.currentTarget;
    if (!(btn instanceof HTMLElement)) {
      return;
    }
    this.scenariosModal()?.close();
    this.selectionModal()?.open(btn);
  }
}
