import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateSimulationResult } from './simulation-result-validator';

const EXAMPLES_DIR = join(
  process.cwd(),
  '../../pokecoach2-python/contracts/examples/openings',
);

const EXAMPLE_FILES = ['empty.json', 'a.json', 'ac.json', 'acb.json', 'acbd.json'] as const;

describe('simulation-result-validator', () => {
  it.each(EXAMPLE_FILES)('validates contract example %s', (name) => {
    const payload = JSON.parse(readFileSync(join(EXAMPLES_DIR, name), 'utf-8'));
    const outcome = validateSimulationResult(payload);
    expect(outcome.ok).toBe(true);
  });

  it('rejects invalid json shape', () => {
    const outcome = validateSimulationResult({ schemaVersion: 1, source: 'mock' });
    expect(outcome.ok).toBe(false);
  });

  it('rejects extra root field', () => {
    const payload = JSON.parse(readFileSync(join(EXAMPLES_DIR, 'empty.json'), 'utf-8'));
    const outcome = validateSimulationResult({ ...payload, unexpected: true });
    expect(outcome.ok).toBe(false);
  });

  it('rejects legacy turn1 on leads', () => {
    const payload = JSON.parse(readFileSync(join(EXAMPLES_DIR, 'a.json'), 'utf-8'));
    const lead = payload.opponentLeads.leads[0];
    const outcome = validateSimulationResult({
      ...payload,
      opponentLeads: {
        ...payload.opponentLeads,
        leads: [{ ...lead, turn1: null }],
      },
    });
    expect(outcome.ok).toBe(false);
  });

  it('rejects legacy refinement without weighted-ab metadata', () => {
    const payload = JSON.parse(readFileSync(join(EXAMPLES_DIR, 'acbd.json'), 'utf-8'));
    payload.refinement = {
      configuration: payload.refinement.configuration,
      sampleSize: 2,
      outcomes: { wins: 2, losses: 0, draws: 0 },
      firstTurnSampleSize: 0,
      firstTurns: [],
      battleIds: ['a', 'b'],
      limitations: [],
    };
    const outcome = validateSimulationResult(payload);
    expect(outcome.ok).toBe(false);
  });

  it('validates complete simulation example with synthesis gameplan', () => {
    const examplesDir = join(process.cwd(), '../../pokecoach2-python/contracts/examples');
    const payload = JSON.parse(
      readFileSync(join(examplesDir, 'simulation-complete.json'), 'utf-8'),
    );
    const outcome = validateSimulationResult(payload);
    expect(outcome.ok).toBe(true);
  });
});
