import { describe, expect, it } from 'vitest';
import {
  buildMockMatchupReport,
} from '../../../testing/fixtures/demo-reports';
import {
  DEMO_IMPORTED_OPPONENT,
  DEMO_IMPORTED_OUR,
} from '../../../testing/fixtures/demo-teams';
import { mapPokemonJson, mapTeamNode } from './coach-mappers';
import type { GqlTeamNode } from './coach-dto';

describe('coach mappers', () => {
  it('maps six pokemon slots', () => {
    const imported = DEMO_IMPORTED_OUR;
    const mapped = mapPokemonJson(imported.pokemon);
    expect(mapped?.length).toBe(6);
  });

  it('rejects malformed pokemon json', () => {
    expect(mapPokemonJson([{ slot: 0 }])).toBeNull();
  });

  it('maps owned team node', () => {
    const node: GqlTeamNode = {
      id: 'a1111111-1111-4111-8111-111111111101',
      kind: 'owned',
      name: 'Test',
      sourceKind: 'text',
      sourceUrl: null,
      sourceText: 'paste',
      pokemon: DEMO_IMPORTED_OUR.pokemon,
      dataVersion: 1,
      createdAt: '2026-01-01T00:00:00Z',
      isDeleted: false,
    };
    expect(mapTeamNode(node, 'owned')?.name).toBe('Test');
  });

  it('validates mock report fixture', () => {
    const ours = {
      id: 'a1111111-1111-4111-8111-111111111101',
      name: 'A',
      source: { kind: 'text' as const, rawText: 'x' },
      pokemon: DEMO_IMPORTED_OUR.pokemon,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const opp = {
      id: 'b2222222-2222-4222-8222-222222222201',
      name: 'B',
      source: { kind: 'text' as const, rawText: 'y' },
      pokemon: DEMO_IMPORTED_OPPONENT.pokemon,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const report = buildMockMatchupReport(ours, opp);
    expect(report.source).toBe('mock');
  });
});
