import {
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CoachApi } from '../../core/graphql/coach-api';
import { userMessageForGraphqlError } from '../../core/graphql/graphql-error';
import { CoachStore } from '../../core/data/coach-store';
import { MatchupPreparation } from '../../core/matchup/matchup-preparation';
import type { Team } from '../../core/models/team.model';

@Component({
  selector: 'app-team-delete-dialog',
  imports: [TranslocoPipe],
  templateUrl: './team-delete-dialog.html',
})
export class TeamDeleteDialog {
  private readonly api = inject(CoachApi);
  private readonly store = inject(CoachStore);
  private readonly preparation = inject(MatchupPreparation);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly deleted = output<string>();

  readonly dialogRef =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly target = signal<Team | null>(null);
  readonly deleting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly uncertain = signal(false);

  private lastTrigger: HTMLElement | null = null;

  open(team: Team, trigger: HTMLElement): void {
    this.target.set(team);
    this.errorMessage.set(null);
    this.uncertain.set(false);
    this.lastTrigger = trigger;
    const dialog = this.dialogRef().nativeElement;
    if (!dialog.open) {
      dialog.showModal();
    }
    queueMicrotask(() => {
      const cancel = this.host.nativeElement.querySelector(
        '#team-delete-cancel',
      ) as HTMLButtonElement | null;
      cancel?.focus();
    });
  }

  close(): void {
    const dialog = this.dialogRef().nativeElement;
    if (dialog.open) {
      dialog.close();
    }
    this.deleting.set(false);
    this.target.set(null);
    this.lastTrigger?.focus();
    this.lastTrigger = null;
  }

  onDialogCancel(event: Event): void {
    if (this.deleting()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.close();
  }

  confirmDelete(): void {
    const team = this.target();
    if (!team || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.errorMessage.set(null);
    this.uncertain.set(false);
    this.api.deleteOwnedTeam(team.id).subscribe({
      next: (deletedId) => this.finishSuccess(deletedId),
      error: (err) => this.handleFailure(team.id, err),
    });
  }

  retry(): void {
    this.confirmDelete();
  }

  private finishSuccess(teamId: string): void {
    this.preparation.forgetTeam(teamId);
    this.store.invalidateAll();
    this.deleting.set(false);
    this.close();
    this.deleted.emit(teamId);
  }

  private handleFailure(teamId: string, err: unknown): void {
    const userMsg = userMessageForGraphqlError(err);
    this.api.ownedTeamExists(teamId).subscribe({
      next: (exists) => {
        this.deleting.set(false);
        if (!exists) {
          this.finishSuccess(teamId);
          return;
        }
        this.errorMessage.set(userMsg);
      },
      error: () => {
        this.deleting.set(false);
        this.uncertain.set(true);
        this.errorMessage.set(userMsg);
      },
    });
  }
}
