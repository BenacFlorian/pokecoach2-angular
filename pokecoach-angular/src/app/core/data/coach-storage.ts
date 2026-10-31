import type { PreparedMatchup } from '../models/matchup.model';
import type { Team } from '../models/team.model';

export const COACH_STORAGE_KEY = 'pokecoach.demo.v1';

export interface CoachSnapshot {
  schemaVersion: 1;
  teams: Team[];
  matchups: PreparedMatchup[];
}

export type StorageResult =
  | { kind: 'ok'; snapshot: CoachSnapshot }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

export function loadCoachSnapshot(): StorageResult {
  if (typeof localStorage === 'undefined') {
    return { kind: 'error', message: 'Stockage local indisponible.' };
  }
  try {
    const raw = localStorage.getItem(COACH_STORAGE_KEY);
    if (!raw) {
      return { kind: 'missing' };
    }
    const parsed = JSON.parse(raw) as unknown;
    const validated = validateSnapshot(parsed);
    if (!validated) {
      return {
        kind: 'error',
        message: 'Sauvegarde locale incompatible ; données de démonstration utilisées.',
      };
    }
    return { kind: 'ok', snapshot: validated };
  } catch {
    return {
      kind: 'error',
      message: 'Impossible de lire la sauvegarde locale.',
    };
  }
}

export function saveCoachSnapshot(snapshot: CoachSnapshot): StorageResult {
  if (typeof localStorage === 'undefined') {
    return { kind: 'error', message: 'Stockage local indisponible.' };
  }
  try {
    localStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(snapshot));
    return { kind: 'ok', snapshot };
  } catch {
    return {
      kind: 'error',
      message: 'Impossible d’enregistrer vos changements localement.',
    };
  }
}

function validateSnapshot(value: unknown): CoachSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const v = value as CoachSnapshot;
  if (v.schemaVersion !== 1) {
    return null;
  }
  if (!Array.isArray(v.teams) || !Array.isArray(v.matchups)) {
    return null;
  }
  for (const team of v.teams) {
    if (!team?.id || !team.name || !Array.isArray(team.pokemon)) {
      return null;
    }
    if (team.pokemon.length !== 6) {
      return null;
    }
  }
  for (const m of v.matchups) {
    if (!m?.id || !m.teamId || !m.opponent) {
      return null;
    }
    const teamExists = v.teams.some((t) => t.id === m.teamId);
    if (!teamExists) {
      return null;
    }
  }
  return v;
}
