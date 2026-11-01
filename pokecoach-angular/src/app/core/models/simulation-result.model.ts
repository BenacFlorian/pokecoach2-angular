/** Enveloppe simulation v2 — ordre A,C,B,D (plan ouvertures conditionnées). */

export type SimulationPhase = 'A' | 'C' | 'B' | 'D' | 'synthesis';

export const SIMULATION_PHASE_ORDER: readonly SimulationPhase[] = [
  'A',
  'C',
  'B',
  'D',
  'synthesis',
];

export interface OpponentLeadEntryV2 {
  id: string;
  slots: readonly [number, number];
  count: number;
}

export interface OpponentLeadsSectionV2 {
  sampleSize: number;
  leads: OpponentLeadEntryV2[];
}

export interface LeadSelectionV2 {
  ourFourSlots: readonly [number, number, number, number];
  ourLeadSlots: readonly [number, number];
}

export interface LeadPickSectionV2 {
  selection: LeadSelectionV2;
  comparisons: unknown[];
  selectionRuleVersion: string;
  limitations: string[];
}

export interface OpeningsSectionV2 {
  selection: LeadSelectionV2;
  recommendationRule: 'model-frequency-v1';
  samplingPolicy: string;
  byOpponentLead: OpeningStudyEntryV2[];
}

export interface OpeningStudyEntryV2 {
  opponentLeadId: string;
  opponentLeadSlots: readonly [number, number];
  sampleSize: number;
  opponentActions: unknown[];
  ourActions: unknown[];
  recommendation: Record<string, unknown>;
  backPairs: unknown[];
  backSlotMarginals: unknown[];
  endStateNotes: string[];
}

export interface RefinementSectionV2 {
  configuration: LeadSelectionV2;
  sampleSize: number;
  outcomes: Record<string, number>;
  firstTurns: unknown[];
  battleIds: string[];
  limitations: string[];
}

export interface GameplanSectionV2 {
  opening: string;
  midgame: string;
  endgame: string;
  threats: unknown[];
  preserve: string[];
  eliminate: string[];
  adaptations: string[];
  evidenceBattleIds: string[];
}

export interface WinConditionSectionV2 {
  description: string;
  rationale: string;
  evidenceBattleIds: string[];
}

export interface SimulationResultV2 {
  schemaVersion: 2;
  source: 'simulation';
  completedPhases: SimulationPhase[];
  opponentLeads: OpponentLeadsSectionV2 | null;
  leadPick: LeadPickSectionV2 | null;
  openings: OpeningsSectionV2 | null;
  refinement: RefinementSectionV2 | null;
  gameplan: GameplanSectionV2 | null;
  winCondition: WinConditionSectionV2 | null;
}

export interface RunProgressJson {
  phase: string;
  completed: number;
  total: number;
}
