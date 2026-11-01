import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildMockMatchupReport,
} from '../../../testing/fixtures/demo-reports';
import {
  DEMO_IMPORTED_OPPONENT,
  DEMO_IMPORTED_OUR,
} from '../../../testing/fixtures/demo-teams';
import type { GqlRunDetailNode, GqlTeamNode } from './coach-dto';
import {
  activeRunStatusMessage,
  formatAnalysisProgressMessage,
  mapPokemonJson,
  mapRunSummary,
  mapSimulationRunView,
  mapTeamNode,
  pokemonSetToDbJson,
  reportProvenanceLabel,
  shouldPollRun,
} from './coach-mappers';
import type { Team } from '../models/team.model';

const EXAMPLES_DIR = join(process.cwd(), '../../pokecoach2-python/contracts/examples');

const MATCHUP_ID = 'c3333333-3333-4333-8333-333333333301';
const RUN_ID = 'd4444444-4444-4444-8444-444444444401';

function baseRunNode(partial: Partial<GqlRunDetailNode>): GqlRunDetailNode {
  return {
    id: RUN_ID,
    status: 'paused',
    processStatus: 'PENDING_STATS',
    source: 'simulation',
    reportVersion: 2,
    report: null,
    ourTeamSnapshot: teamSnapshotJson(),
    opponentTeamSnapshot: opponentSnapshotJson(),
    createdAt: '2026-01-01T00:00:00Z',
    finishedAt: null,
    partialResult: JSON.parse(
      readFileSync(join(EXAMPLES_DIR, 'openings', 'empty.json'), 'utf-8'),
    ),
    resultRevision: 0,
    progress: { phase: 'A', completed: 0, total: 1000 },
    targetPhase: 'A',
    executionMetadata: {},
    matchupId: MATCHUP_ID,
    ...partial,
  };
}

function teamSnapshotJson(): Team {
  return {
    id: 'a1111111-1111-4111-8111-111111111101',
    name: 'A',
    source: { kind: 'text', rawText: 'x' },
    pokemon: DEMO_IMPORTED_OUR.pokemon,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function opponentSnapshotJson(): Team {
  return {
    id: 'b2222222-2222-4222-8222-222222222201',
    name: 'B',
    source: { kind: 'text', rawText: 'y' },
    pokemon: DEMO_IMPORTED_OPPONENT.pokemon,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

describe('coach mappers', () => {
  it('maps six pokemon slots', () => {
    const imported = DEMO_IMPORTED_OUR;
    const mapped = mapPokemonJson(imported.pokemon);
    expect(mapped?.length).toBe(6);
  });

  it('rejects malformed pokemon json', () => {
    expect(mapPokemonJson([{ slot: 0 }])).toBeNull();
  });

  it('omits null pokemon fields for database constraint', () => {
    const json = pokemonSetToDbJson({
      slot: 0,
      species: 'Pikachu',
      moves: ['Thunderbolt'],
      rawBlock: 'x',
    });
    expect(json).not.toHaveProperty('gender');
    expect(json).not.toHaveProperty('level');
    expect(json).not.toHaveProperty('evs');
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
    const ours = teamSnapshotJson();
    const opp = opponentSnapshotJson();
    const report = buildMockMatchupReport(ours, opp);
    expect(report.source).toBe('mock');
  });
  it('maps run progress from matchup list payload', () => {
    const summary = mapRunSummary({
      id: RUN_ID,
      status: 'running',
      processStatus: 'PENDING_GAME_SIMULATIONS',
      source: 'simulation',
      reportVersion: 2,
      report: null,
      ourTeamSnapshot: null,
      opponentTeamSnapshot: null,
      createdAt: '2026-01-01T00:00:00Z',
      finishedAt: null,
      targetPhase: 'B',
      progress: { phase: 'B', completed: 3, total: 10 },
    });
    expect(summary?.progress).toEqual({ phase: 'B', completed: 3, total: 10 });
  });
});

describe('formatAnalysisProgressMessage', () => {
  it('formats phase counter while running', () => {
    const msg = formatAnalysisProgressMessage({
      run: {
        id: RUN_ID,
        status: 'running',
        processStatus: 'PENDING_GAME_SIMULATIONS',
        source: 'simulation',
        createdAt: '',
        finishedAt: null,
        targetPhase: 'B',
        progress: { phase: 'C', completed: 2, total: 8 },
      },
      phaseLabel: (p) => (p === 'C' ? 'Sélection' : p),
    });
    expect(msg).toContain('2/8');
    expect(msg).toContain('Sélection');
  });
});

describe('mapSimulationRunView', () => {
  const OPENINGS_DIR = join(EXAMPLES_DIR, 'openings');
  const examples = ['empty.json', 'a.json', 'ac.json', 'acb.json', 'acbd.json'] as const;

  it.each(examples)('maps contract example openings/%s', (file) => {
    const node = baseRunNode({
      partialResult: JSON.parse(readFileSync(join(OPENINGS_DIR, file), 'utf-8')),
      resultRevision: file === 'acbd.json' ? 5 : 1,
      status: file === 'acbd.json' ? 'succeeded' : 'paused',
    });
    const view = mapSimulationRunView(node, MATCHUP_ID);
    expect(view.kind).toBe('simulation');
    if (view.kind === 'simulation') {
      expect(view.view.partialResult.completedPhases.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('rejects invalid partial json', () => {
    const view = mapSimulationRunView(
      baseRunNode({ partialResult: { bad: true } }),
      MATCHUP_ID,
    );
    expect(view.kind).toBe('incompatible');
  });

  it('rejects unknown report format', () => {
    const view = mapSimulationRunView(
      baseRunNode({ source: 'legacy', reportVersion: 9 }),
      MATCHUP_ID,
    );
    expect(view.kind).toBe('incompatible');
  });

  it('rejects run from another matchup', () => {
    const view = mapSimulationRunView(
      baseRunNode({ matchupId: 'e5555555-5555-4555-8555-555555555501' }),
      MATCHUP_ID,
    );
    expect(view.kind).toBe('incompatible');
    if (view.kind === 'incompatible') {
      expect(view.message).toContain('matchup');
    }
  });

  it('maps mock v1 succeeded runs', () => {
    const ours = teamSnapshotJson();
    const opp = opponentSnapshotJson();
    const report = buildMockMatchupReport(ours, opp);
    const view = mapSimulationRunView(
      {
        ...baseRunNode({
          source: 'mock',
          reportVersion: 1,
          status: 'succeeded',
          processStatus: 'SUCCESS',
          report,
          partialResult: undefined,
        }),
      },
      MATCHUP_ID,
    );
    expect(view.kind).toBe('mock');
  });
});

describe('run status helpers', () => {
  it('polls only queued and running', () => {
    expect(
      shouldPollRun({
        id: RUN_ID,
        status: 'paused',
        processStatus: 'PENDING_STATS',
        source: 'simulation',
        createdAt: '',
        finishedAt: null,
        targetPhase: 'A',
        progress: null,
      }),
    ).toBe(false);
    expect(
      shouldPollRun({
        id: RUN_ID,
        status: 'running',
        processStatus: 'PENDING_STATS',
        source: 'simulation',
        createdAt: '',
        finishedAt: null,
        targetPhase: 'A',
        progress: null,
      }),
    ).toBe(true);
  });

  it('describes paused runs', () => {
    const msg = activeRunStatusMessage({
      id: RUN_ID,
      status: 'paused',
      processStatus: 'PENDING_STATS',
      source: 'simulation',
      createdAt: '',
      finishedAt: null,
      targetPhase: 'A',
      progress: null,
    });
    expect(msg).toEqual({ key: 'runStatus.paused', params: { phase: 'A' } });
  });

  it('labels simulation provenance', () => {
    expect(reportProvenanceLabel('simulation')).toContain('simulation');
  });
});
