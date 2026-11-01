import type { ActionTarget, BattleAction, PokemonRef, Side } from '../models/matchup.model';
import type { Team } from '../models/team.model';

const INDIVIDUAL_TARGETS = new Set([
  'normal',
  'adjacentFoe',
  'adjacentAlly',
  'adjacentAllyOrSelf',
  'any',
]);

export interface MoveTargetLabels {
  zoneLabel: (zone: string) => string;
  selfActor: () => string;
  unknownScope: () => string;
  unknownTarget: () => string;
}

export const DEFAULT_MOVE_TARGET_LABELS: MoveTargetLabels = {
  zoneLabel: (zone) => {
    switch (zone) {
      case 'allySide':
        return 'camp du lanceur';
      case 'foeSide':
        return 'camp adverse';
      case 'allAdjacent':
        return 'tous les Pokémon adjacents, alliés compris';
      case 'allAdjacentFoes':
        return 'tous les adversaires adjacents';
      case 'allies':
        return 'tous les Pokémon actifs du camp du lanceur';
      case 'allyTeam':
        return 'équipe du lanceur';
      case 'all':
        return 'terrain / ensemble du combat';
      case 'randomNormal':
        return 'adversaire adjacent choisi aléatoirement';
      case 'scripted':
        return 'cible déterminée par la mécanique de la capacité';
      case 'field':
        return 'terrain';
      case 'all-opponents':
        return 'tous les adversaires';
      default:
        return zone;
    }
  },
  selfActor: () => 'lanceur',
  unknownScope: () => 'portée non déterminée',
  unknownTarget: () => 'cible non déterminée',
};

function teamForSide(side: Side, ourTeam: Team, opponentTeam: Team): Team {
  return side === 'ours' ? ourTeam : opponentTeam;
}

function formatPokemonRef(
  ref: PokemonRef,
  ourTeam: Team,
  opponentTeam: Team,
  labels: MoveTargetLabels,
): string {
  const team = teamForSide(ref.side, ourTeam, opponentTeam);
  return team.pokemon[ref.slot]?.species ?? labels.unknownTarget();
}

function scopeSuffix(
  action: Extract<BattleAction, { kind: 'move' }>,
  labels: MoveTargetLabels,
): string | null {
  if (action.targetType === 'self') {
    return `(${labels.selfActor()})`;
  }
  if (action.targetType && !INDIVIDUAL_TARGETS.has(action.targetType)) {
    return `(${labels.zoneLabel(action.targetType)})`;
  }
  if (action.targets.length === 1 && action.targets[0].kind === 'zone') {
    const zone = action.targets[0].zone;
    if (zone === 'self') {
      return `(${labels.selfActor()})`;
    }
    if (zone === 'field' || zone === 'all-opponents' || !INDIVIDUAL_TARGETS.has(zone)) {
      return `(${labels.zoneLabel(zone)})`;
    }
  }
  if (action.targetType === null && action.targetSource === 'unknown') {
    return `(${labels.unknownScope()})`;
  }
  return null;
}

function formatMoveTargets(
  action: Extract<BattleAction, { kind: 'move' }>,
  ourTeam: Team,
  opponentTeam: Team,
  labels: MoveTargetLabels,
): string {
  const scope = scopeSuffix(action, labels);
  if (scope !== null) {
    return scope;
  }
  if (action.targets.length === 0) {
    return labels.unknownTarget();
  }
  return action.targets
    .map((target) => formatTarget(target, ourTeam, opponentTeam, labels))
    .join(', ');
}

function formatTarget(
  target: ActionTarget,
  ourTeam: Team,
  opponentTeam: Team,
  labels: MoveTargetLabels,
): string {
  if (target.kind === 'zone') {
    if (target.zone === 'self') {
      return labels.selfActor();
    }
    return labels.zoneLabel(target.zone);
  }
  return formatPokemonRef(target.ref, ourTeam, opponentTeam, labels);
}

function usesArrowSyntax(
  action: Extract<BattleAction, { kind: 'move' }>,
  labels: MoveTargetLabels,
): boolean {
  return scopeSuffix(action, labels) === null;
}

/** Format one battle action with correct actor/target sides (plan 05 + plan 12). */
export function formatBattleAction(
  action: BattleAction,
  ourTeam: Team,
  opponentTeam: Team,
  labels: MoveTargetLabels = DEFAULT_MOVE_TARGET_LABELS,
): string {
  if (action.kind === 'switch') {
    const actorTeam = teamForSide(action.actor.side, ourTeam, opponentTeam);
    const toTeam = teamForSide(action.switchTo.side, ourTeam, opponentTeam);
    const from = actorTeam.pokemon[action.actor.slot]?.species ?? '?';
    const to = toTeam.pokemon[action.switchTo.slot]?.species ?? '?';
    return `${from} → ${to}`;
  }
  const actorTeam = teamForSide(action.actor.side, ourTeam, opponentTeam);
  const actor = actorTeam.pokemon[action.actor.slot]?.species ?? '?';
  const targets = formatMoveTargets(action, ourTeam, opponentTeam, labels);
  const tera = action.terastallize ? ` (Tera ${action.terastallize})` : '';
  if (!usesArrowSyntax(action, labels)) {
    return `${actor} : ${action.move} ${targets}${tera}`;
  }
  return `${actor} : ${action.move} → ${targets}${tera}`;
}

export function formatActionPair(
  pair: readonly [BattleAction, BattleAction],
  ourTeam: Team,
  opponentTeam: Team,
  labels: MoveTargetLabels = DEFAULT_MOVE_TARGET_LABELS,
): string {
  return `${formatBattleAction(pair[0], ourTeam, opponentTeam, labels)} · ${formatBattleAction(pair[1], ourTeam, opponentTeam, labels)}`;
}

export function isBattleAction(raw: unknown): raw is BattleAction {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }
  const obj = raw as Record<string, unknown>;
  if (obj['kind'] === 'switch') {
    return isPokemonRef(obj['actor']) && isPokemonRef(obj['switchTo']);
  }
  if (obj['kind'] === 'move') {
    return (
      isPokemonRef(obj['actor']) &&
      typeof obj['move'] === 'string' &&
      Array.isArray(obj['targets']) &&
      obj['targets'].every(isActionTarget)
    );
  }
  return false;
}

function isActionTarget(raw: unknown): raw is ActionTarget {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }
  const obj = raw as Record<string, unknown>;
  if (obj['kind'] === 'pokemon') {
    return isPokemonRef(obj['ref']);
  }
  if (obj['kind'] === 'zone') {
    return typeof obj['zone'] === 'string';
  }
  return false;
}

function isPokemonRef(raw: unknown): raw is PokemonRef {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }
  const obj = raw as Record<string, unknown>;
  return (
    (obj['side'] === 'ours' || obj['side'] === 'opponent') &&
    typeof obj['slot'] === 'number' &&
    obj['slot'] >= 0 &&
    obj['slot'] <= 5
  );
}

export function parseActionPair(raw: unknown): readonly [BattleAction, BattleAction] | null {
  if (!Array.isArray(raw) || raw.length !== 2) {
    return null;
  }
  if (!isBattleAction(raw[0]) || !isBattleAction(raw[1])) {
    return null;
  }
  return [raw[0], raw[1]];
}

export type ActionResolutionDisplay = {
  actor: PokemonRef;
  executed: boolean;
  reason: string | null;
  cause: string;
  selectedTarget: unknown;
  resolvedTargets: unknown[];
};

export type ActionPairFrequencyDisplay = {
  value: readonly [BattleAction, BattleAction];
  count: number;
  sampleSize: number;
  resolutions?: readonly { value: readonly ActionResolutionDisplay[]; count: number }[];
};

export function parseActionPairFrequency(
  raw: unknown,
): ActionPairFrequencyDisplay | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['count'] !== 'number' || typeof obj['sampleSize'] !== 'number') {
    return null;
  }
  const pair = parseActionPair(obj['value']);
  if (!pair) {
    return null;
  }
  const resolutions = parseResolutionRows(obj['resolutions']);
  return { value: pair, count: obj['count'], sampleSize: obj['sampleSize'], resolutions };
}

function parseResolutionRows(
  raw: unknown,
): readonly { value: readonly ActionResolutionDisplay[]; count: number }[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const rows: { value: readonly ActionResolutionDisplay[]; count: number }[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row['count'] !== 'number' || !Array.isArray(row['value'])) {
      continue;
    }
    const parsed: ActionResolutionDisplay[] = [];
    for (const entry of row['value']) {
      if (typeof entry !== 'object' || entry === null) {
        continue;
      }
      const obj = entry as Record<string, unknown>;
      if (!isPokemonRef(obj['actor'])) {
        continue;
      }
      parsed.push({
        actor: obj['actor'],
        executed: Boolean(obj['executed']),
        reason: typeof obj['reason'] === 'string' ? obj['reason'] : null,
        cause: typeof obj['cause'] === 'string' ? obj['cause'] : 'other',
        selectedTarget: obj['selectedTarget'] ?? null,
        resolvedTargets: Array.isArray(obj['resolvedTargets']) ? obj['resolvedTargets'] : [],
      });
    }
    if (parsed.length === 2) {
      rows.push({ value: parsed, count: row['count'] });
    }
  }
  return rows.length ? rows : undefined;
}

export function formatResolutionCause(
  cause: string,
  labels: { switch: () => string; redirect: () => string; notExecuted: () => string },
): string {
  switch (cause) {
    case 'switch':
      return labels.switch();
    case 'redirect':
      return labels.redirect();
    case 'not-executed':
      return labels.notExecuted();
    default:
      return '';
  }
}

export function formatFrequencyLabel(f: ActionPairFrequencyDisplay): string {
  const pct =
    f.sampleSize > 0 ? Math.round((f.count / f.sampleSize) * 1000) / 10 : 0;
  return `${f.count}/${f.sampleSize} (${pct} %)`;
}

export function createMoveTargetLabels(
  translate: (key: string) => string,
): MoveTargetLabels {
  return {
    zoneLabel: (zone) => translate(`moveTargets.zone.${zone}`),
    selfActor: () => translate('moveTargets.selfActor'),
    unknownScope: () => translate('moveTargets.unknownScope'),
    unknownTarget: () => translate('moveTargets.unknownTarget'),
  };
}
