import {
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { RefinementScenarioCountV2, RefinementSectionV2 } from '../../core/models/simulation-result.model';
import type { Team } from '../../core/models/team.model';
import {
  formatBattleAction,
  formatFrequencyLabel,
} from '../../core/matchup/battle-action-display';
import { formatPercent } from '../../core/matchup/matchup-display';
import { PokemonPortrait } from '../../shared/pokemon/pokemon-portrait';

@Component({
  selector: 'app-refinement-scenarios-modal',
  imports: [PokemonPortrait, TranslocoPipe],
  templateUrl: './refinement-scenarios-modal.html',
})
export class RefinementScenariosModal {
  private readonly transloco = inject(TranslocoService);

  readonly ourTeam = input.required<Team>();
  readonly opponentTeam = input.required<Team>();
  readonly refinement = input<RefinementSectionV2 | null>(null);

  readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private lastTrigger: HTMLElement | null = null;

  open(trigger: HTMLElement): void {
    this.lastTrigger = trigger;
    const dialog = this.dialogRef().nativeElement;
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  close(): void {
    const dialog = this.dialogRef().nativeElement;
    if (dialog.open) {
      dialog.close();
    }
    if (this.lastTrigger?.isConnected) {
      this.lastTrigger.focus();
    }
    this.lastTrigger = null;
  }

  onDialogClose(): void {
    if (this.lastTrigger?.isConnected) {
      this.lastTrigger.focus();
    }
    this.lastTrigger = null;
  }

  onDialogCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  scenarioCountLabel(row: RefinementScenarioCountV2, sampleSize: number): string {
    return this.transloco.translate('leadPick.refinementScenarioCount', {
      count: row.count,
      sample: sampleSize,
      percent: formatPercent(row.count, sampleSize),
    });
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
    const pair = value as [
      import('../../core/models/matchup.model').BattleAction,
      import('../../core/models/matchup.model').BattleAction,
    ];
    return `${formatBattleAction(pair[0], this.ourTeam(), this.opponentTeam())} ; ${formatBattleAction(pair[1], this.ourTeam(), this.opponentTeam())} (n=${count}/${sample})`;
  }

  freqLabel = formatFrequencyLabel;
}
