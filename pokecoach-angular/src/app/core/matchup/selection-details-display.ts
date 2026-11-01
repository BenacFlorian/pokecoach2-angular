import type { LeadRecommendation, SelectionResult } from '../models/matchup.model';
import type { LeadPickSectionV2 } from '../models/simulation-result.model';

export interface SelectionDetailsDisplay {
  comparisons: readonly SelectionResult[];
  limitations: readonly string[];
  selectionRuleVersion: string | null;
  justification: string | null;
}

export function buildSelectionDetails(
  section: LeadPickSectionV2 | null,
  recommendation: LeadRecommendation | null,
  comparisons: readonly SelectionResult[] | null,
): SelectionDetailsDisplay | null {
  if (section) {
    const mapped = comparisons ?? [];
    const justification =
      section.limitations.join(' ').trim() ||
      recommendation?.justification?.trim() ||
      null;
    return {
      comparisons: mapped,
      limitations: section.limitations,
      selectionRuleVersion: section.selectionRuleVersion,
      justification,
    };
  }
  if (!recommendation) {
    return null;
  }
  const mapped = comparisons ?? recommendation.selectionResults ?? [];
  if (!mapped.length && !recommendation.justification?.trim()) {
    return null;
  }
  return {
    comparisons: mapped,
    limitations: [],
    selectionRuleVersion: null,
    justification: recommendation.justification?.trim() || null,
  };
}

export function leadPickSectionFromSimulation(
  partial: import('../models/simulation-result.model').SimulationResultV2 | null,
): LeadPickSectionV2 | null {
  if (!partial?.leadPick) {
    return null;
  }
  if (!partial.completedPhases.includes('C')) {
    return null;
  }
  return partial.leadPick;
}
