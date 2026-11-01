import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

const STORAGE_KEY = 'pokecoach.locale';

export type AppLocale = 'fr' | 'en';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  readonly active = signal<AppLocale>(this.readStored());

  constructor() {
    this.transloco.setActiveLang(this.active());
  }

  toggle(): void {
    const next: AppLocale = this.active() === 'fr' ? 'en' : 'fr';
    this.set(next);
  }

  set(lang: AppLocale): void {
    this.active.set(lang);
    this.transloco.setActiveLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }

  flagEmoji(): string {
    return this.active() === 'fr' ? '🇫🇷' : '🇬🇧';
  }

  shortLabel(): string {
    return this.active() === 'fr' ? 'FR' : 'EN';
  }

  private readStored(): AppLocale {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'en' || raw === 'fr') {
        return raw;
      }
    } catch {
      /* ignore */
    }
    return 'fr';
  }
}
