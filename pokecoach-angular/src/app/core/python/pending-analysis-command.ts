import type { AnalysisStartRequest } from './analysis-api.models';

export const PENDING_ANALYSIS_STORAGE_KEY = 'pokecoach.pendingAnalysis.v1';

export interface PendingAnalysisMarker {
  schemaVersion: 1;
  teamId: string;
  matchupId: string;
  idempotencyKey: string;
  requestBody: AnalysisStartRequest;
}

export function readPendingAnalysisMarker(): PendingAnalysisMarker | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(PENDING_ANALYSIS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingAnalysisMarker;
    if (parsed.schemaVersion !== 1) {
      return null;
    }
    if (
      typeof parsed.teamId !== 'string' ||
      typeof parsed.matchupId !== 'string' ||
      typeof parsed.idempotencyKey !== 'string' ||
      typeof parsed.requestBody?.targetPhase !== 'string' ||
      typeof parsed.requestBody?.profile !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingAnalysisMarker(marker: PendingAnalysisMarker): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  try {
    sessionStorage.setItem(PENDING_ANALYSIS_STORAGE_KEY, JSON.stringify(marker));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingAnalysisMarker(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.removeItem(PENDING_ANALYSIS_STORAGE_KEY);
  } catch {
    /* ignore quota / privacy mode */
  }
}
