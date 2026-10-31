import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CoachStore } from '../../core/data/coach-store';
import { DemoApi, demoErrorMessage } from '../../core/python/demo-api';

@Component({
  selector: 'app-demo-data',
  templateUrl: './demo-data.html',
})
export class DemoData {
  private readonly demoApi = inject(DemoApi);
  private readonly store = inject(CoachStore);
  private readonly router = inject(Router);

  busy = false;
  error: string | null = null;
  lastMessage: string | null = null;

  confirmAndReset(): void {
    if (this.busy) {
      return;
    }
    const ok = globalThis.confirm(
      'Réinstaller la démonstration remplace les trois équipes réservées, le matchup et les résultats associés. Continuer ?',
    );
    if (!ok) {
      return;
    }
    this.busy = true;
    this.error = null;
    this.lastMessage = null;
    this.demoApi
      .resetSeed()
      .pipe(finalize(() => (this.busy = false)))
      .subscribe({
        next: (response) => {
          this.store.invalidateAll();
          this.store.loadTeams();
          this.lastMessage = 'Démonstration réinstallée.';
          void this.router.navigate([
            '/teams',
            response.ownedTeamIds[0],
            'matchups',
            response.matchupId,
          ]);
        },
        error: (err) => {
          this.error = demoErrorMessage(err);
        },
      });
  }

  refreshGraphql(): void {
    this.store.invalidateAll();
    this.store.loadTeams();
    this.error = null;
  }
}
