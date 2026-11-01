import type {
  LeadSelectionV2,
  SimulationPhase,
  SimulationResultV2,
} from '../models/simulation-result.model';

const PHASE_ORDER: SimulationPhase[] = ['A', 'C', 'B', 'D', 'synthesis'];

export type ValidateResultOutcome =
  | { ok: true; value: SimulationResultV2 }
  | { ok: false; message: string };

type ParseOk<T> = { ok: true; value: T };
type ParseFail = { ok: false; message: string };
type ParseResult<T> = ParseOk<T> | ParseFail;

export function validateSimulationResult(
  payload: unknown,
  options: { requireComplete?: boolean } = {},
): ValidateResultOutcome {
  const parsed = parseEnvelope(payload);
  if (!parsed.ok) {
    return parsed;
  }
  const value = parsed.value;
  if (options.requireComplete && value.completedPhases.length !== PHASE_ORDER.length) {
    return { ok: false, message: 'complete result requires all phases including synthesis' };
  }
  return { ok: true, value };
}

function parseEnvelope(payload: unknown): ValidateResultOutcome {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, message: 'payload must be an object' };
  }
  const obj = payload as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ROOT_KEYS.has(key)) {
      return { ok: false, message: `unexpected field: ${key}` };
    }
  }
  if (obj['schemaVersion'] !== 2) {
    return { ok: false, message: 'schemaVersion must be 2' };
  }
  if (obj['source'] !== 'simulation') {
    return { ok: false, message: 'source must be simulation' };
  }
  const phases = parsePhases(obj['completedPhases']);
  if (!phases.ok) {
    return phases;
  }
  const opponentLeads = parseOpponentLeadsSection(obj['opponentLeads']);
  if (!opponentLeads.ok) {
    return opponentLeads;
  }
  const leadPick = parseLeadPickSection(obj['leadPick']);
  if (!leadPick.ok) {
    return leadPick;
  }
  const openings = parseOpeningsSection(obj['openings']);
  if (!openings.ok) {
    return openings;
  }
  const refinement = parseRefinementSection(obj['refinement']);
  if (!refinement.ok) {
    return refinement;
  }
  const gameplan = parseGameplanSection(obj['gameplan']);
  if (!gameplan.ok) {
    return gameplan;
  }
  const winCondition = parseWinConditionSection(obj['winCondition']);
  if (!winCondition.ok) {
    return winCondition;
  }

  const n = phases.value.length;
  const phaseErr = checkPhaseSectionRules(
    n,
    opponentLeads.value,
    leadPick.value,
    openings.value,
    refinement.value,
    gameplan.value,
    winCondition.value,
  );
  if (phaseErr) {
    return { ok: false, message: phaseErr };
  }

  if (
    openings.value !== null &&
    leadPick.value !== null &&
    !selectionEqual(openings.value.selection, leadPick.value.selection)
  ) {
    return { ok: false, message: 'openings.selection must match leadPick.selection' };
  }

  return {
    ok: true,
    value: {
      schemaVersion: 2,
      source: 'simulation',
      completedPhases: phases.value,
      opponentLeads: opponentLeads.value,
      leadPick: leadPick.value,
      openings: openings.value,
      refinement: refinement.value,
      gameplan: gameplan.value,
      winCondition: winCondition.value,
    },
  };
}

const ROOT_KEYS = new Set([
  'schemaVersion',
  'source',
  'completedPhases',
  'opponentLeads',
  'leadPick',
  'openings',
  'refinement',
  'gameplan',
  'winCondition',
]);

function parsePhases(raw: unknown): ParseResult<SimulationPhase[]> {
  if (!Array.isArray(raw)) {
    return { ok: false, message: 'completedPhases must be an array' };
  }
  const phases: SimulationPhase[] = [];
  for (const entry of raw) {
    if (entry !== 'A' && entry !== 'C' && entry !== 'B' && entry !== 'D' && entry !== 'synthesis') {
      return { ok: false, message: 'invalid phase in completedPhases' };
    }
    phases.push(entry);
  }
  if (phases.join(',') !== PHASE_ORDER.slice(0, phases.length).join(',')) {
    return { ok: false, message: 'completedPhases must be a strict prefix of A,C,B,D,synthesis' };
  }
  return { ok: true, value: phases };
}

function selectionEqual(a: LeadSelectionV2, b: LeadSelectionV2): boolean {
  return (
    a.ourFourSlots.join(',') === b.ourFourSlots.join(',') &&
    a.ourLeadSlots.join(',') === b.ourLeadSlots.join(',')
  );
}

function checkPhaseSectionRules(
  n: number,
  opponentLeads: SimulationResultV2['opponentLeads'],
  leadPick: SimulationResultV2['leadPick'],
  openings: SimulationResultV2['openings'],
  refinement: SimulationResultV2['refinement'],
  gameplan: SimulationResultV2['gameplan'],
  winCondition: SimulationResultV2['winCondition'],
): string | null {
  if (n >= 1 && opponentLeads === null) {
    return 'opponentLeads required after phase A';
  }
  if (n < 1 && opponentLeads !== null) {
    return 'opponentLeads forbidden before phase A';
  }
  if (n >= 2 && leadPick === null) {
    return 'leadPick required after phase C';
  }
  if (n < 2 && leadPick !== null) {
    return 'leadPick forbidden before phase C';
  }
  if (n >= 3 && openings === null) {
    return 'openings required after phase B';
  }
  if (n < 3 && openings !== null) {
    return 'openings forbidden before phase B';
  }
  if (n >= 4 && refinement === null) {
    return 'refinement required after phase D';
  }
  if (n < 4 && refinement !== null) {
    return 'refinement forbidden before phase D';
  }
  if (n === 5) {
    if (gameplan === null || winCondition === null) {
      return 'gameplan and winCondition required after synthesis';
    }
  } else if (gameplan !== null || winCondition !== null) {
    return 'LLM fields only allowed after synthesis';
  }
  return null;
}

function parseOpponentLeadsSection(
  raw: unknown,
): ParseResult<SimulationResultV2['opponentLeads']> {
  if (raw === null) {
    return { ok: true, value: null };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'opponentLeads must be an object or null' };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['sampleSize'] !== 'number' || obj['sampleSize'] < 0) {
    return { ok: false, message: 'opponentLeads.sampleSize invalid' };
  }
  if (!Array.isArray(obj['leads'])) {
    return { ok: false, message: 'opponentLeads.leads must be an array' };
  }
  const leads = [];
  for (const entry of obj['leads']) {
    const lead = parseLeadEntry(entry);
    if (!lead.ok) {
      return lead;
    }
    leads.push(lead.value);
  }
  return {
    ok: true,
    value: { sampleSize: obj['sampleSize'], leads },
  };
}

function parseLeadEntry(
  raw: unknown,
): ParseResult<import('../models/simulation-result.model').OpponentLeadEntryV2> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, message: 'lead entry must be an object' };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['id'] !== 'string') {
    return { ok: false, message: 'lead id required' };
  }
  if ('turn1' in obj) {
    return { ok: false, message: 'opponent lead turn1 is not part of the contract' };
  }
  const slots = obj['slots'];
  if (!Array.isArray(slots) || slots.length !== 2) {
    return { ok: false, message: 'lead slots must be a pair' };
  }
  const a = slots[0];
  const b = slots[1];
  if (typeof a !== 'number' || typeof b !== 'number' || a === b || a < 0 || a > 5 || b < 0 || b > 5) {
    return { ok: false, message: 'lead slots must be distinct indices 0-5' };
  }
  if (typeof obj['count'] !== 'number' || obj['count'] < 0) {
    return { ok: false, message: 'lead count invalid' };
  }
  return {
    ok: true,
    value: { id: obj['id'], slots: [a, b] as [number, number], count: obj['count'] },
  };
}

function parseLeadPickSection(
  raw: unknown,
): ParseResult<SimulationResultV2['leadPick']> {
  if (raw === null) {
    return { ok: true, value: null };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, message: 'leadPick must be an object or null' };
  }
  const obj = raw as Record<string, unknown>;
  if ('firstTurns' in obj) {
    return { ok: false, message: 'leadPick.firstTurns is not part of the contract' };
  }
  const selection = parseSelection(obj['selection']);
  if (!selection.ok) {
    return selection;
  }
  if (!Array.isArray(obj['comparisons'])) {
    return { ok: false, message: 'leadPick comparisons must be an array' };
  }
  if (typeof obj['selectionRuleVersion'] !== 'string') {
    return { ok: false, message: 'selectionRuleVersion required' };
  }
  if (!Array.isArray(obj['limitations']) || !obj['limitations'].every((x) => typeof x === 'string')) {
    return { ok: false, message: 'limitations must be string array' };
  }
  return {
    ok: true,
    value: {
      selection: selection.value,
      comparisons: obj['comparisons'],
      selectionRuleVersion: obj['selectionRuleVersion'],
      limitations: obj['limitations'] as string[],
    },
  };
}

function parseOpeningsSection(
  raw: unknown,
): ParseResult<SimulationResultV2['openings']> {
  if (raw === null) {
    return { ok: true, value: null };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'openings must be an object or null' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj['recommendationRule'] !== 'model-frequency-v1') {
    return { ok: false, message: 'openings.recommendationRule invalid' };
  }
  if (typeof obj['samplingPolicy'] !== 'string') {
    return { ok: false, message: 'openings.samplingPolicy required' };
  }
  const selection = parseSelection(obj['selection']);
  if (!selection.ok) {
    return { ok: false, message: 'openings.selection invalid' };
  }
  if (!Array.isArray(obj['byOpponentLead'])) {
    return { ok: false, message: 'openings.byOpponentLead must be an array' };
  }
  const studies = [];
  for (const entry of obj['byOpponentLead']) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, message: 'opening study entry invalid' };
    }
    const e = entry as Record<string, unknown>;
    if (typeof e['opponentLeadId'] !== 'string') {
      return { ok: false, message: 'opponentLeadId required' };
    }
    const slots = e['opponentLeadSlots'];
    if (!Array.isArray(slots) || slots.length !== 2) {
      return { ok: false, message: 'opponentLeadSlots invalid' };
    }
    if (typeof e['sampleSize'] !== 'number' || e['sampleSize'] < 0) {
      return { ok: false, message: 'opening sampleSize invalid' };
    }
    if (!Array.isArray(e['opponentActions']) || !Array.isArray(e['ourActions'])) {
      return { ok: false, message: 'opening action arrays invalid' };
    }
    if (typeof e['recommendation'] !== 'object' || e['recommendation'] === null) {
      return { ok: false, message: 'opening recommendation required' };
    }
    if (!Array.isArray(e['backPairs']) || !Array.isArray(e['backSlotMarginals'])) {
      return { ok: false, message: 'opening back arrays invalid' };
    }
    if (
      !Array.isArray(e['endStateNotes']) ||
      !e['endStateNotes'].every((n) => typeof n === 'string')
    ) {
      return { ok: false, message: 'endStateNotes invalid' };
    }
    studies.push({
      opponentLeadId: e['opponentLeadId'],
      opponentLeadSlots: [slots[0], slots[1]] as [number, number],
      sampleSize: e['sampleSize'],
      opponentActions: e['opponentActions'],
      ourActions: e['ourActions'],
      recommendation: e['recommendation'] as Record<string, unknown>,
      backPairs: e['backPairs'],
      backSlotMarginals: e['backSlotMarginals'],
      endStateNotes: e['endStateNotes'] as string[],
    });
  }
  return {
    ok: true,
    value: {
      selection: selection.value,
      recommendationRule: 'model-frequency-v1',
      samplingPolicy: obj['samplingPolicy'],
      byOpponentLead: studies,
    },
  };
}

function parseSelection(raw: unknown): ParseResult<LeadSelectionV2> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, message: 'selection must be an object' };
  }
  const obj = raw as Record<string, unknown>;
  const four = obj['ourFourSlots'];
  const lead = obj['ourLeadSlots'];
  if (!Array.isArray(four) || four.length !== 4 || !four.every((s) => typeof s === 'number')) {
    return { ok: false, message: 'ourFourSlots invalid' };
  }
  if (new Set(four).size !== 4 || four.some((s) => s < 0 || s > 5)) {
    return { ok: false, message: 'ourFourSlots must be four distinct indices 0-5' };
  }
  if (!Array.isArray(lead) || lead.length !== 2 || !lead.every((s) => typeof s === 'number')) {
    return { ok: false, message: 'ourLeadSlots invalid' };
  }
  const [la, lb] = lead;
  if (la === lb || !four.includes(la) || !four.includes(lb)) {
    return { ok: false, message: 'ourLeadSlots must be two distinct slots from ourFourSlots' };
  }
  return {
    ok: true,
    value: {
      ourFourSlots: four as [number, number, number, number],
      ourLeadSlots: [la, lb] as [number, number],
    },
  };
}

function parseRefinementSection(
  raw: unknown,
): ParseResult<SimulationResultV2['refinement']> {
  if (raw === null) {
    return { ok: true, value: null };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'refinement must be an object or null' };
  }
  const obj = raw as Record<string, unknown>;
  const configuration = parseSelection(obj['configuration']);
  if (!configuration.ok) {
    return { ok: false, message: 'refinement configuration invalid' };
  }
  if (typeof obj['sampleSize'] !== 'number' || obj['sampleSize'] < 0) {
    return { ok: false, message: 'refinement.sampleSize invalid' };
  }
  if (typeof obj['outcomes'] !== 'object' || obj['outcomes'] === null || Array.isArray(obj['outcomes'])) {
    return { ok: false, message: 'refinement.outcomes invalid' };
  }
  if (!Array.isArray(obj['firstTurns']) || !Array.isArray(obj['battleIds']) || !Array.isArray(obj['limitations'])) {
    return { ok: false, message: 'refinement arrays invalid' };
  }
  return {
    ok: true,
    value: {
      configuration: configuration.value,
      sampleSize: obj['sampleSize'],
      outcomes: obj['outcomes'] as Record<string, number>,
      firstTurns: obj['firstTurns'],
      battleIds: obj['battleIds'] as string[],
      limitations: obj['limitations'] as string[],
    },
  };
}

function parseGameplanSection(
  raw: unknown,
): ParseResult<SimulationResultV2['gameplan']> {
  if (raw === null) {
    return { ok: true, value: null };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'gameplan must be an object or null' };
  }
  const obj = raw as Record<string, unknown>;
  for (const key of ['opening', 'midgame', 'endgame']) {
    if (typeof obj[key] !== 'string') {
      return { ok: false, message: `gameplan.${key} required` };
    }
  }
  if (!Array.isArray(obj['threats']) || !Array.isArray(obj['preserve']) || !Array.isArray(obj['eliminate'])) {
    return { ok: false, message: 'gameplan lists invalid' };
  }
  if (!Array.isArray(obj['adaptations']) || !Array.isArray(obj['evidenceBattleIds'])) {
    return { ok: false, message: 'gameplan adaptations/evidence invalid' };
  }
  return {
    ok: true,
    value: {
      opening: obj['opening'] as string,
      midgame: obj['midgame'] as string,
      endgame: obj['endgame'] as string,
      threats: obj['threats'],
      preserve: obj['preserve'] as string[],
      eliminate: obj['eliminate'] as string[],
      adaptations: obj['adaptations'] as string[],
      evidenceBattleIds: obj['evidenceBattleIds'] as string[],
    },
  };
}

function parseWinConditionSection(
  raw: unknown,
): ParseResult<SimulationResultV2['winCondition']> {
  if (raw === null) {
    return { ok: true, value: null };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'winCondition must be an object or null' };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['description'] !== 'string' || typeof obj['rationale'] !== 'string') {
    return { ok: false, message: 'winCondition text fields required' };
  }
  if (!Array.isArray(obj['evidenceBattleIds'])) {
    return { ok: false, message: 'winCondition.evidenceBattleIds invalid' };
  }
  return {
    ok: true,
    value: {
      description: obj['description'],
      rationale: obj['rationale'],
      evidenceBattleIds: obj['evidenceBattleIds'] as string[],
    },
  };
}

// re-export for tests
export { PHASE_ORDER as SIMULATION_PHASE_ORDER_VALIDATOR };
