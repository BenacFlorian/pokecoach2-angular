import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { validateSimulationResult } from '../src/app/core/graphql/simulation-result-validator';

const ACBD = join(
  process.cwd(),
  '../../pokecoach2-python/contracts/examples/openings/acbd.json',
);

test.describe('évaluation globale phase D (contrat)', () => {
  test('le JSON acbd passe le validateur strict refinement', () => {
    const payload = JSON.parse(readFileSync(ACBD, 'utf-8'));
    const outcome = validateSimulationResult(payload);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.message);
    }
    expect(outcome.value.refinement?.samplingPolicy).toBe('weighted-ab');
    expect(outcome.value.completedPhases).toEqual(['A', 'C', 'B', 'D']);
  });

  test('rejette un refinement legacy sans samplingPolicy', () => {
    const payload = JSON.parse(readFileSync(ACBD, 'utf-8'));
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
});
