/** Enveloppe simulation v2 — alignée sur §14 et `analysis_result.py`. */

export type SimulationPhase = 'A' | 'B' | 'C' | 'D' | 'synthesis';

export interface Turn1SectionV2 {
  sampleSize: number;
  jointActions: unknown[];
  backPairs: unknown[];
  backSlotMarginals: unknown[];
  endStateNotes: string[];
}

export interface OpponentLeadEntryV2 {
  id: string;
  slots: readonly [number, number];
  count: number;
  turn1: Turn1SectionV2 | null;
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
  firstTurns: unknown[];
  selectionRuleVersion: string;
  limitations: string[];
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
  refinement: RefinementSectionV2 | null;
  gameplan: GameplanSectionV2 | null;
  winCondition: WinConditionSectionV2 | null;
}

export interface RunProgressJson {
  phase: string;
  completed: number;
  total: number;
}
