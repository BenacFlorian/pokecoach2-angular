import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateSimulationResult } from '../graphql/simulation-result-validator';
import { mapSimulationToTabDisplay } from './simulation-display';

const OPENINGS_DIR = join(
  process.cwd(),
  '../../pokecoach2-python/contracts/examples/openings',
);

function load(name: string) {
  const raw = JSON.parse(readFileSync(join(OPENINGS_DIR, name), 'utf-8'));
  const validated = validateSimulationResult(raw);
  if (!validated.ok) {
    throw new Error(validated.message);
  }
  return validated.value;
}

describe('mapSimulationToTabDisplay', () => {
  it('marks openings pending after AC only', () => {
    const tab = mapSimulationToTabDisplay(load('ac.json'));
    expect(tab.leadRecommendation).not.toBeNull();
    expect(tab.openings).toBeNull();
    expect(tab.openingsPending).toBe(true);
    expect(tab.backsPending).toBe(true);
  });

  it('maps openings for every A lead after ACB', () => {
    const partial = load('acb.json');
    const tab = mapSimulationToTabDisplay(partial);
    expect(tab.openingsPending).toBe(false);
    expect(tab.backsPending).toBe(false);
    expect(tab.openings?.length).toBe(partial.opponentLeads!.leads.length);
    const first = tab.openings![0]!;
    expect(first.recommendation).not.toBeNull();
    expect(first.ourAlternatives.length).toBeGreaterThan(0);
  });
});
