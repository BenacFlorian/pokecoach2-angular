import {
  Component,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { OpponentLeadStats, SelectionResult } from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';
import type { SelectionDetailsDisplay } from '../../core/matchup/selection-details-display';
import { formatPercent, opponentLeadLabelById } from '../../core/matchup/matchup-display';

@Component({
  selector: 'app-selection-detail-modal',
  imports: [TranslocoPipe],
  templateUrl: './selection-detail-modal.html',
})
export class SelectionDetailModal {
  readonly opponentTeam = input.required<Team>();
  readonly opponentLeads = input<readonly OpponentLeadStats[] | null>(null);
  readonly details = input<SelectionDetailsDisplay | null>(null);

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

  leadLabel(leadId: string): string {
    const leads = this.opponentLeads();
    if (!leads) {
      return leadId;
    }
    return opponentLeadLabelById(this.opponentTeam(), leads, leadId);
  }

  winRate(result: SelectionResult): string | null {
    if (result.sampleSize === 0) {
      return null;
    }
    return formatPercent(result.wins, result.sampleSize);
  }
}
