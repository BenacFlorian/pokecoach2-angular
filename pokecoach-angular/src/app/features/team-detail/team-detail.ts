import { Component, effect, inject, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoachStore } from '../../core/data/coach-store';
import { activeRunStatusMessage } from '../../core/graphql/coach-mappers';
import { MatchupPreparation } from '../../core/matchup/matchup-preparation';
import { TeamImportDialog } from '../../shared/teams/team-import-dialog';
import type { TeamImportSubmit } from '../../shared/teams/team-import-dialog';
import { TeamStrip } from '../../shared/teams/team-strip';
import { PokemonPortrait } from '../../shared/pokemon/pokemon-portrait';

@Component({
  selector: 'app-team-detail',
  imports: [RouterLink, TeamStrip, TeamImportDialog, PokemonPortrait],
  templateUrl: './team-detail.html',
})
export class TeamDetail {
  readonly teamId = input.required<string>();

  readonly store = inject(CoachStore);
  readonly preparation = inject(MatchupPreparation);

  readonly importDialog = viewChild.required(TeamImportDialog);

  constructor() {
    effect(() => {
      const id = this.teamId();
      this.store.loadTeam(id);
      this.store.loadMatchups(id);
      this.preparation.resumePendingIfAny();
    });

    effect(() => {
      const snap = this.preparation.snapshot();
      const dialog = this.importDialog();
      const busy =
        snap.phase === 'creating' ||
        snap.phase === 'reconciling';
      dialog.setSaving(busy);
      if (snap.phase === 'accepted') {
        dialog.close();
      }
    });
  }

  openOpponentImport(trigger: HTMLButtonElement): void {
    this.importDialog().open(trigger);
  }

  onOpponentSubmitted(payload: TeamImportSubmit): void {
    const team = this.store.teamDetail();
    if (!team || team.id !== this.teamId()) {
      return;
    }
    this.importDialog().setSaving(true);
    this.preparation.submit(team.id, payload);
  }

  preparationBusy(): boolean {
    const phase = this.preparation.snapshot().phase;
    return phase === 'creating' || phase === 'reconciling';
  }

  matchupStatusLabel(matchupId: string): string | null {
    const summary = this.store.matchups().find((m) => m.id === matchupId);
    if (!summary) {
      return null;
    }
    if (summary.hasSuccessfulReport) {
      return null;
    }
    const runMsg = activeRunStatusMessage(summary.latestRun);
    if (runMsg) {
      return runMsg;
    }
    return 'Matchup enregistré — aucune analyse disponible';
  }
}
