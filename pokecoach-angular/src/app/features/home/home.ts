import { Component, inject, isDevMode, OnInit, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CoachStore } from '../../core/data/coach-store';
import { userMessageForGraphqlError } from '../../core/graphql/graphql-error';
import { TeamImportDialog } from '../../shared/teams/team-import-dialog';
import { TeamStrip } from '../../shared/teams/team-strip';
import type { TeamImportSubmit } from '../../shared/teams/team-import-dialog';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TeamStrip, TeamImportDialog],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  readonly store = inject(CoachStore);
  readonly showDevLinks = isDevMode();
  readonly importDialog = viewChild.required(TeamImportDialog);

  savingTeam = false;
  saveTeamError: string | null = null;
  private pendingTeamId: string | null = null;

  ngOnInit(): void {
    this.store.loadTeams();
  }

  openImport(trigger: HTMLButtonElement): void {
    this.saveTeamError = null;
    this.importDialog().open(trigger);
  }

  onTeamImported(payload: TeamImportSubmit): void {
    if (this.savingTeam) {
      return;
    }
    if (!this.pendingTeamId) {
      this.pendingTeamId = crypto.randomUUID();
    }
    const requestId = this.pendingTeamId;
    this.savingTeam = true;
    this.saveTeamError = null;
    this.importDialog().setSaving(true);

    this.store
      .createOwnedTeam(requestId, payload.name, payload.imported)
      .pipe(
        finalize(() => {
          this.savingTeam = false;
          this.importDialog().setSaving(false);
        }),
      )
      .subscribe({
        next: (team) => {
          this.pendingTeamId = null;
          this.store.prependTeam(team);
          this.store.loadTeams();
          this.importDialog().close();
        },
        error: (err) => {
          this.saveTeamError = userMessageForGraphqlError(err);
          this.store.reconcileOwnedTeam(requestId).subscribe({
            next: (existing) => {
              if (existing) {
                this.pendingTeamId = null;
                this.store.prependTeam(existing);
                this.store.loadTeams();
                this.importDialog().close();
              }
            },
          });
        },
      });
  }

  onImportCancelled(): void {
    if (!this.savingTeam) {
      this.pendingTeamId = null;
    }
  }

  retryTeams(): void {
    this.store.loadTeams();
  }
}
