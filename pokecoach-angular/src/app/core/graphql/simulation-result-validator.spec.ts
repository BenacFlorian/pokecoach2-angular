import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateSimulationResult } from './simulation-result-validator';

const EXAMPLES_DIR = join(process.cwd(), '../../pokecoach2-python/contracts/examples');

const EXAMPLE_FILES = [
  'simulation-empty.json',
  'simulation-a.json',
  'simulation-ab.json',
  'simulation-abc.json',
  'simulation-abcd.json',
  'simulation-complete.json',
] as const;

describe('simulation-result-validator', () => {
  it.each(EXAMPLE_FILES)('validates contract example %s', (name) => {
    const payload = JSON.parse(readFileSync(join(EXAMPLES_DIR, name), 'utf-8'));
    const requireComplete = name === 'simulation-complete.json';
    const outcome = validateSimulationResult(payload, { requireComplete });
    expect(outcome.ok).toBe(true);
  });

  it('rejects invalid json shape', () => {
    const outcome = validateSimulationResult({ schemaVersion: 1, source: 'mock' });
    expect(outcome.ok).toBe(false);
  });

  it('rejects extra root field', () => {
    const payload = JSON.parse(
      readFileSync(join(EXAMPLES_DIR, 'simulation-empty.json'), 'utf-8'),
    );
    const outcome = validateSimulationResult({ ...payload, unexpected: true });
    expect(outcome.ok).toBe(false);
  });

  it('rejects unknown format source', () => {
    const outcome = validateSimulationResult({
      schemaVersion: 2,
      source: 'legacy',
      completedPhases: [],
      opponentLeads: null,
      leadPick: null,
      refinement: null,
      gameplan: null,
      winCondition: null,
    });
    expect(outcome.ok).toBe(false);
  });
});
