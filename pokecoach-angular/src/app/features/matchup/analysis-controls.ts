import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CoachStore } from '../../core/data/coach-store';
import type { RunProgress, RunSummary, RunStatusI18n } from '../../core/graphql/coach-mappers';
import {
  type AnalysisCapabilitiesView,
  type AnalysisProfile,
} from '../../core/python/analysis-api.models';
import { AnalysisApi } from '../../core/python/analysis-api';
import { AnalysisError } from '../../core/python/analysis-error';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-analysis-controls',
  imports: [TranslocoPipe],
  templateUrl: './analysis-controls.html',
})
export class AnalysisControls {
  readonly teamId = input.required<string>();
  readonly matchupId = input.required<string>();
  readonly selectedRun = input<RunSummary | null>(null);
  readonly capabilities = input<AnalysisCapabilitiesView | null>(null);
  readonly progressBar = input<RunProgress | null>(null);
  readonly progressHint = input<string | null>(null);
  readonly runStatus = input<RunStatusI18n | null>(null);

  readonly runStarted = output<string>();
  readonly commandError = output<string>();

  private readonly api = inject(AnalysisApi);
  private readonly store = inject(CoachStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  private startKey: string | null = null;

  readonly canStart = computed(() => {
    const caps = this.capabilities();
    const run = this.selectedRun();
    if (!caps || this.busy()) {
      return false;
    }
    if (run && (run.status === 'queued' || run.status === 'running')) {
      return false;
    }
    if (!caps.defaultTargetPhase) {
      return false;
    }
    return caps.phases.length > 0;
  });

  readonly canCancel = computed(() => {
    const run = this.selectedRun();
    return Boolean(run && (run.status === 'queued' || run.status === 'running') && !this.busy());
  });

  readonly helperText = computed(() => {
    if (!this.capabilities()) {
      return this.transloco.translate('analysis.helperUnavailable');
    }
    const run = this.selectedRun();
    if (run?.status === 'queued' || run?.status === 'running') {
      return this.transloco.translate('analysis.helperRunning');
    }
    if (run?.status === 'paused') {
      return this.transloco.translate('analysis.helperPaused');
    }
    return this.transloco.translate('analysis.helperIdle');
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
    if (!targetPhase) {
      return;
    }
    const profile: AnalysisProfile = 'standard';

    this.busy.set(true);
    this.error.set(null);
    if (!this.startKey) {
      this.startKey = crypto.randomUUID();
    }

    this.api
      .start(
        this.matchupId(),
        { targetPhase, profile, locale: this.locale.active() },
        this.startKey,
      )
      .subscribe({
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
        if (err instanceof AnalysisError && err.status === 404) {
          this.startKey = null;
          this.store.refreshMatchup(this.teamId(), this.matchupId());
          this.error.set(err.message);
          this.commandError.emit(err.message);
          return;
        }
        const msg =
          err instanceof AnalysisError
            ? err.message
            : this.transloco.translate('analysis.launchFailed');
        this.error.set(msg);
        this.commandError.emit(msg);
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
        if (err instanceof AnalysisError && err.status === 404) {
          this.store.refreshMatchup(this.teamId(), this.matchupId());
        }
        const msg =
          err instanceof AnalysisError
            ? err.message
            : this.transloco.translate('analysis.cancelFailed');
        this.error.set(msg);
      },
    });
  }
}
