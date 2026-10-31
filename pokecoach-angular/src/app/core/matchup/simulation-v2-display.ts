import type {
  GameplanReport,
  LeadRecommendation,
  OpponentLeadStats,
  SelectionResult,
} from '../models/matchup.model';
import type { PokemonSlot } from '../models/team.model';
import type { RefinementSectionV2, SimulationResultV2 } from '../models/simulation-result.model';

export interface SimulationTabDisplay {
  opponentLeads: readonly OpponentLeadStats[] | null;
  turn1Pending: boolean;
  leadRecommendation: LeadRecommendation | null;
  selectionComparisons: readonly SelectionResult[] | null;
  studiedLeadIds: readonly string[];
  refinement: RefinementSectionV2 | null;
  gameplan: GameplanReport | null;
}

export function mapSimulationV2ToTabDisplay(
  partial: SimulationResultV2,
): SimulationTabDisplay {
  const phaseB = partial.completedPhases.includes('B');
  const phaseC = partial.completedPhases.includes('C');
  const phaseD = partial.completedPhases.includes('D');
  const phaseSynthesis = partial.completedPhases.includes('synthesis');

  const opponentLeads = partial.opponentLeads
    ? partial.opponentLeads.leads.map((lead) => mapLeadEntry(lead, partial.opponentLeads!.sampleSize, phaseB))
    : null;

  let leadRecommendation: LeadRecommendation | null = null;
  let selectionComparisons: readonly SelectionResult[] | null = null;
  let studiedLeadIds: readonly string[] = [];

  if (partial.leadPick) {
    leadRecommendation = mapLeadRecommendation(partial.leadPick);
    selectionComparisons = mapComparisons(partial.leadPick.comparisons);
    studiedLeadIds = opponentLeads?.map((l) => l.id) ?? [];
  } else if (opponentLeads) {
    studiedLeadIds = opponentLeads.map((l) => l.id);
  }

  const gameplan =
    phaseSynthesis && partial.gameplan && partial.winCondition
      ? mapGameplan(partial.gameplan, partial.winCondition, partial.leadPick?.limitations ?? [])
      : null;

  return {
    opponentLeads,
    turn1Pending: Boolean(opponentLeads?.length) && !phaseB,
    leadRecommendation: phaseC ? leadRecommendation : null,
    selectionComparisons: phaseC ? selectionComparisons : null,
    studiedLeadIds,
    refinement: phaseD ? partial.refinement : null,
    gameplan,
  };
}

function mapLeadEntry(
  lead: import('../models/simulation-result.model').OpponentLeadEntryV2,
  phaseASampleSize: number,
  phaseB: boolean,
): OpponentLeadStats {
  const leadSlots = lead.slots as readonly [PokemonSlot, PokemonSlot];
  if (!phaseB || lead.turn1 === null) {
    return {
      id: lead.id,
      leadSlots,
      phaseASampleSize,
      phaseACount: lead.count,
      jointTurn1Actions: [],
      backPairs: [],
      backSlotMarginals: [],
      turn1EndObservations: [],
    };
  }
  return {
    id: lead.id,
    leadSlots,
    phaseASampleSize,
    phaseACount: lead.count,
    jointTurn1Actions: mapFrequencyList(lead.turn1.jointActions, lead.turn1.sampleSize),
    backPairs: mapPairFrequencyList(lead.turn1.backPairs, lead.turn1.sampleSize),
    backSlotMarginals: mapSlotFrequencyList(lead.turn1.backSlotMarginals, lead.turn1.sampleSize),
    turn1EndObservations: lead.turn1.endStateNotes,
  };
}

function mapFrequencyList(raw: unknown[], sampleSize: number): OpponentLeadStats['jointTurn1Actions'] {
  const out: OpponentLeadStats['jointTurn1Actions'][number][] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const obj = entry as Record<string, unknown>;
    if (typeof obj['count'] !== 'number' || obj['value'] === undefined) {
      continue;
    }
    out.push({
      value: obj['value'] as OpponentLeadStats['jointTurn1Actions'][number]['value'],
      count: obj['count'],
      sampleSize: typeof obj['sampleSize'] === 'number' ? obj['sampleSize'] : sampleSize,
    });
  }
  return out;
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
    studiedLeads: mapStudiedLeads(section.firstTurns),
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

function mapStudiedLeads(
  raw: unknown[],
): LeadRecommendation['studiedLeads'] {
  const out: LeadRecommendation['studiedLeads'][number][] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const obj = entry as Record<string, unknown>;
    if (typeof obj['opponentLeadId'] !== 'string') {
      continue;
    }
    const actions = Array.isArray(obj['primaryActions']) ? obj['primaryActions'] : [];
    const alternatives = Array.isArray(obj['alternatives'])
      ? obj['alternatives'].filter((a): a is string => typeof a === 'string')
      : [];
    const adaptations = Array.isArray(obj['adaptations'])
      ? obj['adaptations'].filter((a): a is string => typeof a === 'string')
      : [];
    out.push({
      opponentLeadId: obj['opponentLeadId'],
      primaryActions:
        actions as unknown as LeadRecommendation['studiedLeads'][number]['primaryActions'],
      alternatives,
      adaptations,
    });
  }
  return out;
}

function mapGameplan(
  section: import('../models/simulation-result.model').GameplanSectionV2,
  win: import('../models/simulation-result.model').WinConditionSectionV2,
  limitations: string[],
): GameplanReport {
  const threats = section.threats
    .map((t) => {
      if (typeof t === 'object' && t !== null) {
        const obj = t as Record<string, unknown>;
        if (typeof obj['label'] === 'string' && typeof obj['detail'] === 'string') {
          return { label: obj['label'], detail: obj['detail'] };
        }
      }
      return null;
    })
    .filter((t): t is { label: string; detail: string } => t !== null);

  return {
    opening: section.opening,
    midgame: section.midgame,
    endgame: section.endgame,
    threats,
    preserve: section.preserve,
    eliminate: section.eliminate,
    adaptations: section.adaptations,
    winCondition: win.description,
    refinementSequences: [],
    sampleLimitation: limitations.join(' ') || win.rationale,
  };
}
