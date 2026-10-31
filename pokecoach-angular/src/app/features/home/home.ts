import { Component, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoachStore } from '../../core/data/coach-store';
import { TeamImportDialog } from '../../shared/teams/team-import-dialog';
import { TeamStrip } from '../../shared/teams/team-strip';
import type { TeamImportSubmit } from '../../shared/teams/team-import-dialog';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TeamStrip, TeamImportDialog],
  templateUrl: './home.html',
})
export class Home {
  readonly store = inject(CoachStore);
  readonly importDialog = viewChild.required(TeamImportDialog);

  openImport(trigger: HTMLButtonElement): void {
    this.importDialog().open(trigger);
  }

  onTeamImported(payload: TeamImportSubmit): void {
    this.store.addTeam(payload.name, payload.imported);
  }
}
