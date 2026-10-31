import { Component, DestroyRef, effect, inject, input, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CoachStore } from '../../core/data/coach-store';
import { activeRunStatusMessage } from '../../core/graphql/coach-mappers';
import { userMessageForGraphqlError } from '../../core/graphql/graphql-error';
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
  private readonly destroyRef = inject(DestroyRef);

  readonly importDialog = viewChild.required(TeamImportDialog);

  savingMatchup = false;
  saveMatchupError: string | null = null;
  private pendingMatchupIds: { matchupId: string; opponentId: string } | null = null;

  constructor() {
    effect(() => {
      const id = this.teamId();
      this.store.loadTeam(id);
      this.store.loadMatchups(id);
    });
  }

  openOpponentImport(trigger: HTMLButtonElement): void {
    this.saveMatchupError = null;
    this.importDialog().open(trigger);
  }

  onOpponentSubmitted(payload: TeamImportSubmit): void {
    if (this.savingMatchup) {
      return;
    }
    const team = this.store.teamDetail();
    if (!team || team.id !== this.teamId()) {
      return;
    }
    if (!this.pendingMatchupIds) {
      this.pendingMatchupIds = {
        matchupId: crypto.randomUUID(),
        opponentId: crypto.randomUUID(),
      };
    }
    const ids = this.pendingMatchupIds;
    const capturedTeamId = team.id;

    this.savingMatchup = true;
    this.saveMatchupError = null;
    this.importDialog().setSaving(true);

    this.store
      .createOpponentMatchup(ids, capturedTeamId, payload.name, payload.imported)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.savingMatchup = false;
          this.importDialog().setSaving(false);
        }),
      )
      .subscribe({
        next: (summary) => {
          if (this.teamId() !== capturedTeamId) {
            return;
          }
          this.pendingMatchupIds = null;
          this.store.appendMatchup(summary);
          this.store.loadMatchups(capturedTeamId);
          this.importDialog().close();
        },
        error: (err) => {
          this.saveMatchupError = userMessageForGraphqlError(err);
          this.store.reconcileMatchup(capturedTeamId, ids.matchupId).subscribe({
            next: (detail) => {
              if (detail && this.teamId() === capturedTeamId) {
                this.pendingMatchupIds = null;
                this.store.appendMatchup({
                  id: detail.id,
                  teamId: detail.teamId,
                  opponent: detail.opponentTeam,
                  createdAt: detail.createdAt,
                  latestRun: detail.latestRun,
                  hasSuccessfulReport: detail.successfulResult.kind === 'valid',
                });
                this.store.loadMatchups(capturedTeamId);
                this.importDialog().close();
              }
            },
          });
          this.importDialog().resetLoading();
        },
      });
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
