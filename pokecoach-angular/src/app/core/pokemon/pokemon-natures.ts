import { Injectable } from '@angular/core';

/** Abréviations alignées sur l’usage Showdown (EV lines). */
export type NatureStat = 'HP' | 'Atk' | 'Def' | 'SpA' | 'SpD' | 'Spe';

export interface NatureModifiers {
  plus?: NatureStat;
  minus?: NatureStat;
}

/** Les 25 natures officielles ; les neutres n’ont ni plus ni moins. */
const NATURE_MODIFIERS: Record<string, NatureModifiers> = {
  Hardy: {},
  Lonely: { plus: 'Atk', minus: 'Def' },
  Brave: { plus: 'Atk', minus: 'Spe' },
  Adamant: { plus: 'Atk', minus: 'SpA' },
  Naughty: { plus: 'Atk', minus: 'SpD' },
  Bold: { plus: 'Def', minus: 'Atk' },
  Docile: {},
  Relaxed: { plus: 'Def', minus: 'Spe' },
  Impish: { plus: 'Def', minus: 'SpA' },
  Lax: { plus: 'Def', minus: 'SpD' },
  Timid: { plus: 'Spe', minus: 'Atk' },
  Hasty: { plus: 'Spe', minus: 'Def' },
  Serious: {},
  Jolly: { plus: 'Spe', minus: 'SpA' },
  Naive: { plus: 'Spe', minus: 'SpD' },
  Modest: { plus: 'SpA', minus: 'Atk' },
  Mild: { plus: 'SpA', minus: 'Def' },
  Quiet: { plus: 'SpA', minus: 'Spe' },
  Bashful: {},
  Rash: { plus: 'SpA', minus: 'SpD' },
  Calm: { plus: 'SpD', minus: 'Atk' },
  Gentle: { plus: 'SpD', minus: 'Def' },
  Sassy: { plus: 'SpD', minus: 'Spe' },
  Careful: { plus: 'SpD', minus: 'SpA' },
  Quirky: {},
};

export function normalizeNatureName(raw: string): string {
  return raw.trim();
}

export function getNatureModifiers(nature: string): NatureModifiers | undefined {
  const key = normalizeNatureName(nature);
  if (!key) {
    return undefined;
  }
  if (key in NATURE_MODIFIERS) {
    return NATURE_MODIFIERS[key];
  }
  const title =
    key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  return NATURE_MODIFIERS[title];
}

/** Ex. `Timid (+Spe −Atk)` ou `Hardy` si neutre. */
export function formatNatureWithModifiers(nature: string | undefined): string | null {
  if (!nature?.trim()) {
    return null;
  }
  const name = normalizeNatureName(nature);
  const mods = getNatureModifiers(name);
  if (!mods) {
    return name;
  }
  if (!mods.plus && !mods.minus) {
    return name;
  }
  return `${name} (+${mods.plus} −${mods.minus})`;
}

@Injectable({ providedIn: 'root' })
export class PokemonNatureLabels {
  formatWithModifiers(nature: string | undefined): string | null {
    return formatNatureWithModifiers(nature);
  }

  modifiers(nature: string): NatureModifiers | undefined {
    return getNatureModifiers(nature);
  }
}
