import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateSimulationResult } from '../../core/graphql/simulation-result-validator';
import type { RefinementSectionV2 } from '../../core/models/simulation-result.model';
import { formatPercent } from '../../core/matchup/matchup-display';

const ACBD = join(
  process.cwd(),
  '../../pokecoach2-python/contracts/examples/openings/acbd.json',
);

describe('LeadPick global refinement display helpers', () => {
  it('computes win rate as wins over sampleSize (draws stay in denominator)', () => {
    expect(formatPercent(1, 2)).toBe('50.0 %');
    expect(formatPercent(0, 2)).toBe('0.0 %');
  });

  it('accepts contract acbd refinement envelope', () => {
    const payload = JSON.parse(readFileSync(ACBD, 'utf-8'));
    const outcome = validateSimulationResult(payload);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    const ref = outcome.value.refinement as RefinementSectionV2;
    expect(ref.samplingPolicy).toBe('weighted-ab');
    expect(ref.scenarioCounts.reduce((s, r) => s + r.count, 0)).toBe(ref.sampleSize);
  });
});
