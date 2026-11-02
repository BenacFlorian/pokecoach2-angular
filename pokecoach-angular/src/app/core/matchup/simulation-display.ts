import type { PokemonSlot, Team } from '../models/team.model';
import type { RefinementSectionV2, SimulationResultV2 } from '../models/simulation-result.model';
import type {
  GameplanReport,
  LeadRecommendation,
  OpponentLeadStats,
  SelectionResult,
} from '../models/matchup.model';
import {
  mapPokemonHighlights,
  type GameplanHighlightDisplay,
} from './gameplan-display';
import {
  parseActionPairFrequency,
  type ActionPairFrequencyDisplay,
} from './battle-action-display';

export interface OpeningStudyDisplay {
  opponentLeadId: string;
  opponentLeadSlots: readonly [PokemonSlot, PokemonSlot];
  phaseACount: number;
  phaseASampleSize: number;
  sampleSize: number;
  opponentActions: ActionPairFrequencyDisplay[];
  ourActions: ActionPairFrequencyDisplay[];
  recommendation: ActionPairFrequencyDisplay | null;
  ourAlternatives: ActionPairFrequencyDisplay[];
  opponentPrimary: ActionPairFrequencyDisplay | null;
  opponentAlternatives: ActionPairFrequencyDisplay[];
  endStateNotes: readonly string[];
}

export interface SimulationTabDisplay {
  opponentLeads: readonly OpponentLeadStats[] | null;
  backsPending: boolean;
  openings: readonly OpeningStudyDisplay[] | null;
  openingsPending: boolean;
  leadRecommendation: LeadRecommendation | null;
  selectionComparisons: readonly SelectionResult[] | null;
  refinement: RefinementSectionV2 | null;
  gameplan: GameplanReport | null;
}

export function mapSimulationToTabDisplay(
  partial: SimulationResultV2,
  teams?: { ours: Team; opponent: Team },
): SimulationTabDisplay {
  const hasC = partial.completedPhases.includes('C');
  const hasB = partial.completedPhases.includes('B');
  const hasD = partial.completedPhases.includes('D');
  const hasSynthesis = partial.completedPhases.includes('synthesis');

  const countById = new Map(
    partial.opponentLeads?.leads.map((l) => [l.id, l.count]) ?? [],
  );

  const opponentLeads = partial.opponentLeads
    ? mapOpponentLeadsForTab(partial, hasB)
    : null;

  let leadRecommendation: LeadRecommendation | null = null;
  let selectionComparisons: readonly SelectionResult[] | null = null;

  if (partial.leadPick && hasC) {
    leadRecommendation = mapLeadRecommendation(partial.leadPick);
    selectionComparisons = mapComparisons(partial.leadPick.comparisons);
  }

  const openings = hasB && partial.openings
    ? mapOpenings(partial, countById)
    : null;

  const gameplan =
    hasSynthesis && partial.gameplan && partial.winCondition && teams
      ? mapGameplan(partial.gameplan, partial.winCondition, teams)
      : null;

  return {
    opponentLeads,
    backsPending: Boolean(opponentLeads?.length) && !hasB,
    openings,
    openingsPending: hasC && !hasB,
    leadRecommendation,
    selectionComparisons,
    refinement: hasD ? partial.refinement : null,
    gameplan,
  };
}

function mapOpponentLeadsForTab(
  partial: SimulationResultV2,
  hasB: boolean,
): OpponentLeadStats[] {
  const section = partial.opponentLeads!;
  const backsById = new Map<
    string,
    { backPairs: OpponentLeadStats['backPairs']; marginals: OpponentLeadStats['backSlotMarginals'] }
  >();
  if (hasB && partial.openings) {
    for (const study of partial.openings.byOpponentLead) {
      backsById.set(study.opponentLeadId, {
        backPairs: mapPairFrequencyList(study.backPairs, study.sampleSize),
        marginals: mapSlotFrequencyList(study.backSlotMarginals, study.sampleSize),
      });
    }
  }
  return section.leads.map((lead) => {
    const leadSlots = lead.slots as readonly [PokemonSlot, PokemonSlot];
    const backs = backsById.get(lead.id);
    return {
      id: lead.id,
      leadSlots,
      phaseASampleSize: section.sampleSize,
      phaseACount: lead.count,
      jointTurn1Actions: [],
      backPairs: backs?.backPairs ?? [],
      backSlotMarginals: backs?.marginals ?? [],
      turn1EndObservations: [],
    };
  });
}

function mapOpenings(
  partial: SimulationResultV2,
  countById: Map<string, number>,
): OpeningStudyDisplay[] {
  const section = partial.opponentLeads!;
  const studyById = new Map(
    partial.openings!.byOpponentLead.map((s) => [s.opponentLeadId, s]),
  );
  const sorted = [...section.leads].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.id.localeCompare(b.id);
  });
  return sorted.map((lead) => {
    const study = studyById.get(lead.id);
    if (!study) {
      throw new Error(`missing opening study for lead ${lead.id}`);
    }
    const ourActions = mapActionPairFrequencies(study.ourActions);
    const opponentActions = mapActionPairFrequencies(study.opponentActions);
    const recommendation = parseActionPairFrequency(study.recommendation);
    const ourAlternatives = recommendation
      ? ourActions.filter(
          (row) =>
            row.count !== recommendation.count ||
            JSON.stringify(row.value) !== JSON.stringify(recommendation.value),
        )
      : ourActions.slice(1);
    const opponentPrimary = opponentActions[0] ?? null;
    const opponentAlternatives = opponentActions.slice(1);
    return {
      opponentLeadId: lead.id,
      opponentLeadSlots: lead.slots as readonly [PokemonSlot, PokemonSlot],
      phaseACount: countById.get(lead.id) ?? lead.count,
      phaseASampleSize: section.sampleSize,
      sampleSize: study.sampleSize,
      opponentActions,
      ourActions,
      recommendation,
      ourAlternatives,
      opponentPrimary,
      opponentAlternatives,
      endStateNotes: study.endStateNotes,
    };
  });
}

function mapActionPairFrequencies(raw: unknown[]): ActionPairFrequencyDisplay[] {
  const out: ActionPairFrequencyDisplay[] = [];
  for (const entry of raw) {
    const parsed = parseActionPairFrequency(entry);
    if (parsed) {
      out.push(parsed);
    }
  }
  return out.sort((a, b) => b.count - a.count || b.sampleSize - a.sampleSize);
}

function mapPairFrequencyList(
  raw: unknown[],
  sampleSize: number,
): OpponentLeadStats['backPairs'] {
  const out: OpponentLeadStats['backPairs'][number][] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const obj = entry as Record<string, unknown>;
    if (typeof obj['count'] !== 'number' || !Array.isArray(obj['value'])) {
      continue;
    }
    const pair = obj['value'];
    if (pair.length !== 2) {
      continue;
    }
    out.push({
      value: [pair[0] as PokemonSlot, pair[1] as PokemonSlot],
      count: obj['count'],
      sampleSize: typeof obj['sampleSize'] === 'number' ? obj['sampleSize'] : sampleSize,
    });
  }
  return out;
}

function mapSlotFrequencyList(
  raw: unknown[],
  sampleSize: number,
): OpponentLeadStats['backSlotMarginals'] {
  const out: OpponentLeadStats['backSlotMarginals'][number][] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const obj = entry as Record<string, unknown>;
    if (typeof obj['count'] !== 'number' || typeof obj['value'] !== 'number') {
      continue;
    }
    out.push({
      value: obj['value'] as PokemonSlot,
      count: obj['count'],
      sampleSize: typeof obj['sampleSize'] === 'number' ? obj['sampleSize'] : sampleSize,
    });
  }
  return out;
}

function orderFourLeadsFirst(
  four: LeadRecommendation['ourFourSlots'],
  lead: LeadRecommendation['ourLeadSlots'],
): LeadRecommendation['ourFourSlots'] {
  const [leadA, leadB] = lead;
  const leadSet = new Set<PokemonSlot>([leadA, leadB]);
  const backs = four.filter((s): s is PokemonSlot => !leadSet.has(s)).sort((a, b) => a - b);
  return [leadA, leadB, backs[0], backs[1]];
}

function mapLeadRecommendation(
  section: import('../models/simulation-result.model').LeadPickSectionV2,
): LeadRecommendation {
  const sel = section.selection;
  const ourFourSlots = orderFourLeadsFirst(
    sel.ourFourSlots as LeadRecommendation['ourFourSlots'],
    sel.ourLeadSlots as LeadRecommendation['ourLeadSlots'],
  );
  return {
    ourFourSlots,
    ourLeadSlots: sel.ourLeadSlots as LeadRecommendation['ourLeadSlots'],
    justification: section.limitations.join(' ') || 'Sélection calculée par simulation.',
    selectionResults: mapComparisons(section.comparisons),
    studiedLeads: [],
  };
}

function mapComparisons(raw: unknown[]): readonly SelectionResult[] {
  const out: SelectionResult[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const obj = entry as Record<string, unknown>;
    if (typeof obj['opponentLeadId'] !== 'string') {
      continue;
    }
    const wins = typeof obj['wins'] === 'number' ? obj['wins'] : 0;
    const losses = typeof obj['losses'] === 'number' ? obj['losses'] : 0;
    const draws = typeof obj['draws'] === 'number' ? obj['draws'] : 0;
    const sampleSize =
      typeof obj['sampleSize'] === 'number' ? obj['sampleSize'] : wins + losses + draws;
    const four = obj['ourFourSlots'];
    const lead = obj['ourLeadSlots'];
    if (!Array.isArray(four) || four.length !== 4 || !Array.isArray(lead) || lead.length !== 2) {
      continue;
    }
    const fourTyped = four as unknown as SelectionResult['ourFourSlots'];
    const leadTyped = lead as unknown as SelectionResult['ourLeadSlots'];
    out.push({
      opponentLeadId: obj['opponentLeadId'],
      ourFourSlots: orderFourLeadsFirst(fourTyped, leadTyped),
      ourLeadSlots: leadTyped,
      wins,
      losses,
      draws,
      sampleSize,
    });
  }
  return out;
}

function mapGameplan(
  section: import('../models/simulation-result.model').GameplanSectionV2,
  win: import('../models/simulation-result.model').WinConditionSectionV2,
  teams: { ours: Team; opponent: Team },
): GameplanReport {
  const threats: GameplanHighlightDisplay[] = mapPokemonHighlights(
    section.threats,
    teams.ours,
    teams.opponent,
  );
  const strengths: GameplanHighlightDisplay[] = mapPokemonHighlights(
    section.strengths,
    teams.ours,
    teams.opponent,
  );

  return {
    opening: section.opening,
    midgame: section.midgame,
    endgame: section.endgame,
    threats,
    strengths,
    winCondition: win.description,
    winConditionRationale: win.rationale,
    refinementSequences: [],
    sampleLimitation: '',
  };
}
