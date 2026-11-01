import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateSimulationResult } from '../graphql/simulation-result-validator';
import type { LeadRecommendation } from '../models/matchup.model';
import { mapSimulationToTabDisplay } from './simulation-display';
import {
  buildSelectionDetails,
  leadPickSectionFromSimulation,
} from './selection-details-display';

const ACB = join(
  process.cwd(),
  '../../pokecoach2-python/contracts/examples/openings/acb.json',
);

describe('buildSelectionDetails', () => {
  it('returns null before phase C', () => {
    const payload = JSON.parse(readFileSync(ACB, 'utf-8'));
    const outcome = validateSimulationResult(payload);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    const partial = {
      ...outcome.value,
      completedPhases: ['A', 'B'] as import('../models/simulation-result.model').SimulationPhase[],
    };
    expect(leadPickSectionFromSimulation(partial)).toBeNull();
    expect(
      buildSelectionDetails(null, null, mapSimulationToTabDisplay(partial).selectionComparisons),
    ).toBeNull();
  });

  it('exposes rule, limitations and comparisons after C', () => {
    const payload = JSON.parse(readFileSync(ACB, 'utf-8'));
    const outcome = validateSimulationResult(payload);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    const partial = outcome.value;
    const tab = mapSimulationToTabDisplay(partial);
    const section = leadPickSectionFromSimulation(partial);
    expect(section).not.toBeNull();
    const details = buildSelectionDetails(
      section,
      tab.leadRecommendation,
      tab.selectionComparisons,
    );
    expect(details).not.toBeNull();
    expect(details!.selectionRuleVersion).toBeTruthy();
    expect(details!.comparisons.length).toBeGreaterThan(0);
  });

  it('uses recommendation justification on demo path without section', () => {
    const rec: LeadRecommendation = {
      ourFourSlots: [0, 1, 2, 3],
      ourLeadSlots: [0, 1],
      justification: 'Demo pick',
      selectionResults: [],
      studiedLeads: [],
    };
    const details = buildSelectionDetails(null, rec, []);
    expect(details?.justification).toBe('Demo pick');
    expect(details?.selectionRuleVersion).toBeNull();
  });
});
