import { describe, expect, it } from 'vitest';
import {
  buildMockMatchupReport,
  validateReportInvariants,
} from './demo-reports';
import { DEMO_IMPORTED_OUR, DEMO_IMPORTED_OPPONENT } from './demo-teams';
import { PokepasteParser } from '../import/pokepaste-parser';

describe('demo reports', () => {
  const parser = new PokepasteParser();
  const ours = {
    id: 't1',
    name: 'Ours',
    source: DEMO_IMPORTED_OUR.source,
    pokemon: DEMO_IMPORTED_OUR.pokemon,
    createdAt: '2026-01-01T00:00:00Z',
  };
  const opponent = {
    id: 't2',
    name: 'Opp',
    source: DEMO_IMPORTED_OPPONENT.source,
    pokemon: DEMO_IMPORTED_OPPONENT.pokemon,
    createdAt: '2026-01-01T00:00:00Z',
  };

  it('builds report with phase A totals', () => {
    const report = buildMockMatchupReport(ours, opponent);
    expect(report.phaseASampleSize).toBe(1000);
    const sum = report.opponentLeads.reduce((s, l) => s + l.phaseACount, 0);
    expect(sum).toBe(1000);
    expect(validateReportInvariants(report)).toEqual([]);
  });

  it('demo pastes parse to six pokemon', () => {
    expect(parser.parse(DEMO_IMPORTED_OUR.source.rawText).kind).toBe('success');
  });
});
