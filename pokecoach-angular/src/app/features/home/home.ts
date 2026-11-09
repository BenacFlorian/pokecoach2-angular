import { Component, inject, isDevMode, OnInit, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CoachStore } from '../../core/data/coach-store';
import { userMessageForGraphqlError } from '../../core/graphql/graphql-error';
import { TeamImportDialog } from '../../shared/teams/team-import-dialog';
import { TeamDeleteDialog } from '../../shared/teams/team-delete-dialog';
import { TeamStrip } from '../../shared/teams/team-strip';
import type { TeamImportSubmit } from '../../shared/teams/team-import-dialog';
import type { Team } from '../../core/models/team.model';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TeamStrip, TeamImportDialog, TeamDeleteDialog, TranslocoPipe],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  readonly store = inject(CoachStore);
  readonly showDevLinks = isDevMode();
  readonly importDialog = viewChild.required(TeamImportDialog);
  readonly deleteDialog = viewChild.required(TeamDeleteDialog);

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

  openDelete(trigger: HTMLButtonElement, team: Team, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.deleteDialog().open(team, trigger);
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

    this.store.createOwnedTeam(requestId, payload.name, payload.imported).subscribe({
      next: (team) => this.completeTeamSave(team),
      error: (err) => {
        this.saveTeamError = userMessageForGraphqlError(err);
        this.store.reconcileOwnedTeam(requestId).subscribe({
          next: (existing) => {
            if (existing) {
              this.completeTeamSave(existing);
            } else {
              this.releaseTeamSave();
            }
          },
          error: () => this.releaseTeamSave(),
        });
      },
    });
  }

  onTeamDeleted(_teamId: string): void {
    this.store.loadTeams();
  }

  onImportCancelled(): void {
    if (!this.savingTeam) {
      this.pendingTeamId = null;
    }
  }

  retryTeams(): void {
    this.store.loadTeams();
  }

  private completeTeamSave(team: Team): void {
    this.pendingTeamId = null;
    this.store.loadTeams();
    this.importDialog().close();
    this.releaseTeamSave();
  }

  private releaseTeamSave(): void {
    this.savingTeam = false;
    this.importDialog().setSaving(false);
  }
}
