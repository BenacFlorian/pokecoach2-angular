import {
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import type { ImportedTeam } from '../../core/models/team.model';
import { TeamImport, TeamImportError } from '../../core/import/team-import';

export type TeamImportContext = 'own-team' | 'opponent';

export interface TeamImportSubmit {
  name: string;
  imported: ImportedTeam;
}

@Component({
  selector: 'app-team-import-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './team-import-dialog.html',
})
export class TeamImportDialog {
  private readonly teamImport = inject(TeamImport);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly context = input<TeamImportContext>('own-team');
  readonly preparationStatus = input<string | null>(null);
  readonly submitted = output<TeamImportSubmit>();
  readonly cancelled = output<void>();

  readonly dialogRef =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly resolving = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly errorDetails = signal<readonly string[]>([]);

  readonly sourceMode = signal<'url' | 'text'>('url');

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    url: new FormControl('', { nonNullable: true }),
    text: new FormControl('', { nonNullable: true }),
  });

  private resolveSub: Subscription | null = null;
  private lastTrigger: HTMLElement | null = null;

  open(trigger?: HTMLElement): void {
    this.lastTrigger = trigger ?? null;
    this.errorMessage.set(null);
    this.errorDetails.set([]);
    if (!this.saving()) {
      this.form.reset({ name: '', url: '', text: '' });
      this.sourceMode.set('url');
    }
    const dialog = this.dialogRef().nativeElement;
    if (!dialog.open) {
      dialog.showModal();
    }
    queueMicrotask(() => {
      const nameInput = this.host.nativeElement.querySelector(
        '#team-import-name',
      ) as HTMLInputElement | null;
      nameInput?.focus();
    });
  }

  close(): void {
    this.cancelResolveOnly();
    const dialog = this.dialogRef().nativeElement;
    if (dialog.open) {
      dialog.close();
    }
    this.lastTrigger?.focus();
    this.lastTrigger = null;
    this.saving.set(false);
  }

  setSaving(active: boolean): void {
    this.saving.set(active);
  }

  setMode(mode: 'url' | 'text'): void {
    if (this.resolving() || this.saving()) {
      return;
    }
    this.sourceMode.set(mode);
    this.errorMessage.set(null);
  }

  onDialogCancel(event: Event): void {
    if (this.resolving() || this.saving()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.cancelled.emit();
    this.close();
  }

  submit(): void {
    if (this.resolving() || this.saving()) {
      return;
    }
    const name = this.form.controls.name.value.trim();
    if (!name) {
      this.errorMessage.set('Indiquez un nom pour cette équipe.');
      return;
    }

    const mode = this.sourceMode();
    const input =
      mode === 'url'
        ? ({ kind: 'url' as const, value: this.form.controls.url.value.trim() })
        : ({
            kind: 'text' as const,
            value: this.form.controls.text.value.trim(),
          });

    if (mode === 'url' && !input.value) {
      this.errorMessage.set('Collez l’URL pokepast.es ou passez au texte Showdown.');
      return;
    }
    if (mode === 'text' && !input.value) {
      this.errorMessage.set('Collez le texte Showdown (six Pokémon).');
      return;
    }

    this.resolving.set(true);
    this.errorMessage.set(null);
    this.errorDetails.set([]);
    this.cancelResolveOnly();

    this.resolveSub = this.teamImport.resolve(input).subscribe({
      next: (imported) => {
        this.resolving.set(false);
        this.submitted.emit({ name, imported });
      },
      error: (err: unknown) => {
        this.resolving.set(false);
        if (err instanceof TeamImportError) {
          this.errorMessage.set(err.message);
          this.errorDetails.set(err.details ?? []);
        } else {
          this.errorMessage.set(
            'Import impossible pour le moment. Réessayez ou changez de source.',
          );
        }
      },
    });
  }

  private cancelResolveOnly(): void {
    this.resolveSub?.unsubscribe();
    this.resolveSub = null;
  }

  resetLoading(): void {
    this.resolving.set(false);
    this.saving.set(false);
  }

  canSubmit(): boolean {
    if (this.resolving() || this.saving()) {
      return false;
    }
    if (!this.form.controls.name.value.trim()) {
      return false;
    }
    if (this.sourceMode() === 'url') {
      return Boolean(this.form.controls.url.value.trim());
    }
    return Boolean(this.form.controls.text.value.trim());
  }
}
