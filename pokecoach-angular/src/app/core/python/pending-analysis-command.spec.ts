import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  clearPendingAnalysisMarker,
  readPendingAnalysisMarker,
  writePendingAnalysisMarker,
  PENDING_ANALYSIS_STORAGE_KEY,
} from './pending-analysis-command';

describe('pending-analysis-command', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('round-trips marker', () => {
    const marker = {
      schemaVersion: 1 as const,
      teamId: 'a1111111-1111-4111-8111-111111111101',
      matchupId: 'c3333333-3333-4333-8333-333333333301',
      idempotencyKey: 'd4444444-4444-4444-8444-444444444401',
      requestBody: { targetPhase: 'A', profile: 'standard' as const },
    };
    expect(writePendingAnalysisMarker(marker)).toBe(true);
    expect(readPendingAnalysisMarker()).toEqual(marker);
    clearPendingAnalysisMarker();
    expect(readPendingAnalysisMarker()).toBeNull();
  });

  it('ignores corrupted marker', () => {
    sessionStorage.setItem(PENDING_ANALYSIS_STORAGE_KEY, '{not-json');
    expect(readPendingAnalysisMarker()).toBeNull();
  });
});
