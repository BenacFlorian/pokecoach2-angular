import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CoachStore } from '../../core/data/coach-store';
import type { RunSummary } from '../../core/graphql/coach-mappers';
import {
  type AnalysisCapabilitiesView,
  type AnalysisProfile,
} from '../../core/python/analysis-api.models';
import { AnalysisApi } from '../../core/python/analysis-api';
import { AnalysisError } from '../../core/python/analysis-error';

@Component({
  selector: 'app-analysis-controls',
  templateUrl: './analysis-controls.html',
})
export class AnalysisControls {
  readonly teamId = input.required<string>();
  readonly matchupId = input.required<string>();
  readonly selectedRun = input<RunSummary | null>(null);
  readonly capabilities = input<AnalysisCapabilitiesView | null>(null);

  readonly runStarted = output<string>();
  readonly commandError = output<string>();

  private readonly api = inject(AnalysisApi);
  private readonly store = inject(CoachStore);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  private startKey: string | null = null;
  private continueKey: string | null = null;

  readonly canStart = computed(() => {
    const caps = this.capabilities();
    const run = this.selectedRun();
    if (!caps || this.busy()) {
      return false;
    }
    if (run && (run.status === 'queued' || run.status === 'running')) {
      return false;
    }
    return caps.phases.length > 0;
  });

  readonly canContinue = computed(() => {
    const run = this.selectedRun();
    const caps = this.capabilities();
    return Boolean(run?.status === 'paused' && caps && !this.busy());
  });

  readonly canCancel = computed(() => {
    const run = this.selectedRun();
    return Boolean(run && (run.status === 'queued' || run.status === 'running') && !this.busy());
  });

  readonly helperText = computed(() => {
    if (!this.capabilities()) {
      return 'Analyse indisponible (API Python ou worker).';
    }
    const run = this.selectedRun();
    if (run?.status === 'queued' || run?.status === 'running') {
      return 'Analyse en cours — les résultats partiels apparaîtront ici.';
    }
    if (run?.status === 'paused') {
      return 'Étape terminée pour l’instant. « Continuer » enchaînera les phases suivantes quand elles seront disponibles.';
    }
    return 'Analyse A→C→B→D enchaînées quand les phases sont disponibles ; pause après la cible ou la dernière phase implémentée.';
  });

  launch(): void {
    if (!this.canStart()) {
      return;
    }
    const caps = this.capabilities();
    if (!caps) {
      return;
    }
    const targetPhase = caps.defaultTargetPhase;
    const profile: AnalysisProfile = 'standard';

    this.busy.set(true);
    this.error.set(null);
    if (!this.startKey) {
      this.startKey = crypto.randomUUID();
    }

    this.api.start(this.matchupId(), { targetPhase, profile }, this.startKey).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.startKey = null;
        this.store.refreshMatchup(this.teamId(), this.matchupId());
        void this.router.navigate([], {
          queryParams: { runId: res.runId },
          queryParamsHandling: 'merge',
        });
        this.runStarted.emit(res.runId);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const msg = err instanceof AnalysisError ? err.message : 'Échec du lancement.';
        this.error.set(msg);
        this.commandError.emit(msg);
      },
    });
  }

  continueRun(): void {
    const run = this.selectedRun();
    const caps = this.capabilities();
    if (!run || !caps || !this.canContinue()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    if (!this.continueKey) {
      this.continueKey = crypto.randomUUID();
    }
    this.api
      .continue(run.id, { targetPhase: caps.defaultTargetPhase }, this.continueKey)
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.continueKey = null;
          this.store.refreshMatchup(this.teamId(), this.matchupId());
          this.store.refreshRun(this.teamId(), this.matchupId(), run.id);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          const msg =
            err instanceof AnalysisError ? err.message : 'Échec de la continuation.';
          this.error.set(msg);
        },
      });
  }

  cancelRun(): void {
    const run = this.selectedRun();
    if (!run || !this.canCancel()) {
      return;
    }
    this.busy.set(true);
    this.api.cancel(run.id, crypto.randomUUID()).subscribe({
      next: () => {
        this.busy.set(false);
        this.store.refreshMatchup(this.teamId(), this.matchupId());
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const msg = err instanceof AnalysisError ? err.message : 'Annulation impossible.';
        this.error.set(msg);
      },
    });
  }
}
