import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CoachStore } from '../../core/data/coach-store';
import { activeRunStatusMessage } from '../../core/graphql/coach-mappers';
import { MatchupPreparation } from '../../core/matchup/matchup-preparation';
import { TeamDeleteDialog } from '../../shared/teams/team-delete-dialog';
import { TeamImportDialog } from '../../shared/teams/team-import-dialog';
import type { TeamImportSubmit } from '../../shared/teams/team-import-dialog';
import { TeamStrip } from '../../shared/teams/team-strip';
import { PokemonPortrait } from '../../shared/pokemon/pokemon-portrait';
import type { Team } from '../../core/models/team.model';

@Component({
  selector: 'app-team-detail',
  imports: [
    RouterLink,
    TeamStrip,
    TeamImportDialog,
    TeamDeleteDialog,
    PokemonPortrait,
    TranslocoPipe,
  ],
  templateUrl: './team-detail.html',
})
export class TeamDetail {
  readonly teamId = input.required<string>();

  readonly store = inject(CoachStore);
  readonly preparation = inject(MatchupPreparation);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly importDialog = viewChild.required(TeamImportDialog);
  readonly deleteDialog = viewChild.required(TeamDeleteDialog);

  readonly speciesQuery = signal('');
  private lastLoadedSearch = '';
  private composing = false;
  private lastTeamId = '';

  constructor() {
    effect(() => {
      const id = this.teamId();
      if (id !== this.lastTeamId) {
        const previous = this.lastTeamId;
        this.lastTeamId = id;
        this.speciesQuery.set('');
        this.lastLoadedSearch = '';
        if (previous) {
          this.preparation.leaveTeam(previous);
        }
        untracked(() => {
          this.store.loadTeam(id);
          this.store.loadMatchups(id, '', 0);
        });
      }
    });

    effect(() => {
      const snap = this.preparation.snapshot();
      const routeTeamId = this.teamId();
      const dialog = this.importDialog();
      if (!dialog) {
        return;
      }
      const busy = snap.phase === 'creating' || snap.phase === 'reconciling';
      dialog.setSaving(busy);
      if (snap.phase === 'accepted' && snap.teamId === routeTeamId && snap.matchupId) {
        dialog.close();
        this.speciesQuery.set('');
        this.lastLoadedSearch = '';
        this.store.loadMatchups(routeTeamId, '', 0);
        this.preparation.acknowledgeCreated(snap.matchupId);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.store.clearMatchupListContext(this.teamId());
      this.preparation.leaveTeam(this.teamId());
    });
  }

  onSearchInput(value: string): void {
    this.speciesQuery.set(value);
    if (this.composing) {
      return;
    }
    this.scheduleSearchLoad();
  }

  onCompositionStart(): void {
    this.composing = true;
  }

  onCompositionEnd(event: CompositionEvent): void {
    this.composing = false;
    const target = event.target as HTMLInputElement | null;
    this.speciesQuery.set(target?.value ?? '');
    this.scheduleSearchLoad();
  }

  clearSearch(): void {
    this.speciesQuery.set('');
    this.lastLoadedSearch = '';
    this.store.loadMatchups(this.teamId(), '', 0);
  }

  retryMatchups(): void {
    this.store.loadMatchups(this.teamId(), this.speciesQuery(), 0);
  }

  private scheduleSearchLoad(): void {
    const trimmed = this.speciesQuery().trim();
    if (trimmed === this.lastLoadedSearch) {
      return;
    }
    this.lastLoadedSearch = trimmed;
    this.store.loadMatchups(this.teamId(), trimmed, 250);
  }

  openOpponentImport(trigger: HTMLButtonElement): void {
    this.importDialog().open(trigger);
  }

  openDelete(trigger: HTMLButtonElement, team: Team): void {
    this.deleteDialog().open(team, trigger);
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

  hasActiveFilter(): boolean {
    return this.speciesQuery().trim().length > 0;
  }

  onTeamDeleted(teamId: string): void {
    if (this.teamId() === teamId) {
      void this.router.navigate(['/']);
    }
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
      return this.transloco.translate(runMsg.key, runMsg.params);
    }
    return this.transloco.translate('runStatus.none');
  }
}
