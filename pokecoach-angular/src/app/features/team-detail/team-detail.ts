import { Component, DestroyRef, inject, input, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CoachStore } from '../../core/data/coach-store';
import { MockMatchupPreparation } from '../../core/data/mock-matchup-preparation';
import type { Team } from '../../core/models/team.model';
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

  private readonly store = inject(CoachStore);
  private readonly mockPrep = inject(MockMatchupPreparation);
  private readonly destroyRef = inject(DestroyRef);

  readonly importDialog = viewChild.required(TeamImportDialog);

  preparing = false;
  prepareError: string | null = null;
  private prepareSub: Subscription | null = null;

  team(): Team | undefined {
    return this.store.getTeam(this.teamId());
  }

  matchups() {
    return this.store.matchupsFor(this.teamId());
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelPrepare());
  }

  openOpponentImport(trigger: HTMLButtonElement): void {
    this.prepareError = null;
    this.importDialog().open(trigger);
  }

  onOpponentSubmitted(payload: TeamImportSubmit): void {
    const ours = this.team();
    if (!ours) {
      return;
    }
    const capturedTeamId = ours.id;
    const opponent: Team = {
      id: crypto.randomUUID(),
      name: payload.name.trim(),
      source: payload.imported.source,
      pokemon: payload.imported.pokemon,
      createdAt: new Date().toISOString(),
    };

    this.preparing = true;
    this.prepareError = null;
    this.cancelPrepare();

    this.prepareSub = this.mockPrep
      .prepare(ours, opponent)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (matchup) => {
          if (this.teamId() !== capturedTeamId) {
            return;
          }
          this.store.addMatchup(matchup);
          this.preparing = false;
          this.importDialog().close();
        },
        error: () => {
          this.preparing = false;
          this.prepareError =
            'La préparation de démonstration a échoué. Réessayez avec une autre source.';
          this.importDialog().resetLoading();
        },
      });
  }

  private cancelPrepare(): void {
    this.prepareSub?.unsubscribe();
    this.prepareSub = null;
    this.preparing = false;
  }
}
