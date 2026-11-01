import type { PokemonSlot, Team } from './team.model';

export type Side = 'ours' | 'opponent';

export interface PokemonRef {
  side: Side;
  slot: PokemonSlot;
}

export type ShowdownMoveTarget =
  | 'normal'
  | 'adjacentFoe'
  | 'adjacentAlly'
  | 'adjacentAllyOrSelf'
  | 'any'
  | 'self'
  | 'allAdjacent'
  | 'allAdjacentFoes'
  | 'allies'
  | 'allySide'
  | 'allyTeam'
  | 'foeSide'
  | 'all'
  | 'randomNormal'
  | 'scripted';

/** Legacy zones from analyses before plan 12. */
export type LegacyActionZone = 'field' | 'all-opponents' | 'self';

export type ActionTarget =
  | { kind: 'pokemon'; ref: PokemonRef }
  | { kind: 'zone'; zone: ShowdownMoveTarget | LegacyActionZone };

export type TargetSource = 'request' | 'dex' | 'unknown';

export type BattleAction =
  | {
      kind: 'move';
      actor: PokemonRef;
      move: string;
      targets: ActionTarget[];
      moveId?: string | null;
      targetType?: ShowdownMoveTarget | null;
      targetSource?: TargetSource | null;
      terastallize?: string;
    }
  | { kind: 'switch'; actor: PokemonRef; switchTo: PokemonRef };

export interface Frequency<T> {
  value: T;
  count: number;
  sampleSize: number;
}

export function frequencyPercent(f: Frequency<unknown>): number | null {
  if (f.sampleSize === 0) {
    return null;
  }
  return (f.count / f.sampleSize) * 100;
}

export interface OpponentLeadStats {
  id: string;
  leadSlots: readonly [PokemonSlot, PokemonSlot];
  phaseASampleSize: number;
  phaseACount: number;
  jointTurn1Actions: readonly Frequency<readonly [BattleAction, BattleAction]>[];
  backPairs: readonly Frequency<readonly [PokemonSlot, PokemonSlot]>[];
  backSlotMarginals: readonly Frequency<PokemonSlot>[];
  turn1EndObservations: readonly string[];
}

export interface SelectionResult {
  opponentLeadId: string;
  ourFourSlots: readonly [PokemonSlot, PokemonSlot, PokemonSlot, PokemonSlot];
  ourLeadSlots: readonly [PokemonSlot, PokemonSlot];
  wins: number;
  losses: number;
  draws: number;
  sampleSize: number;
}

export interface LeadRecommendation {
  ourFourSlots: readonly [PokemonSlot, PokemonSlot, PokemonSlot, PokemonSlot];
  ourLeadSlots: readonly [PokemonSlot, PokemonSlot];
  justification: string;
  selectionResults: readonly SelectionResult[];
  studiedLeads: readonly {
    opponentLeadId: string;
    primaryActions: readonly [BattleAction, BattleAction];
    alternatives: readonly string[];
    adaptations: readonly string[];
  }[];
}

export interface GameplanReport {
  opening: string;
  midgame: string;
  endgame: string;
  threats: readonly { label: string; detail: string }[];
  strengths: readonly { label: string; detail: string }[];
  winCondition: string;
  winConditionRationale: string;
  refinementSequences: readonly { label: string; detail: string }[];
  sampleLimitation: string;
}

export interface MatchupReport {
  source: 'mock';
  fixtureVersion: 1;
  phaseASampleSize: number;
  phaseBSampleSize: number;
  phaseCSampleSize: number;
  phaseDSampleSize: number;
  opponentLeads: readonly OpponentLeadStats[];
  selectionComparisons: readonly SelectionResult[];
  leadRecommendation: LeadRecommendation;
  gameplan: GameplanReport;
}

export interface PreparedMatchup {
  id: string;
  teamId: string;
  opponent: Team;
  report: MatchupReport;
  createdAt: string;
}
