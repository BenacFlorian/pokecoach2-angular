import type { ActionTarget, BattleAction, PokemonRef, Side } from '../models/matchup.model';
import type { Team } from '../models/team.model';

function teamForSide(side: Side, ourTeam: Team, opponentTeam: Team): Team {
  return side === 'ours' ? ourTeam : opponentTeam;
}

function formatTarget(
  target: ActionTarget,
  ourTeam: Team,
  opponentTeam: Team,
): string {
  if (target.kind === 'zone') {
    switch (target.zone) {
      case 'field':
        return 'terrain';
      case 'all-opponents':
        return 'tous les adversaires';
      case 'self':
        return 'soi-même';
      default:
        return target.zone;
    }
  }
  const team = teamForSide(target.ref.side, ourTeam, opponentTeam);
  return team.pokemon[target.ref.slot]?.species ?? `slot ${target.ref.slot}`;
}

/** Omit arrow target clause when the move only affects the field or all foes. */
function formatMoveTargets(
  move: string,
  targets: ActionTarget[],
  ourTeam: Team,
  opponentTeam: Team,
): string {
  if (
    targets.length === 1 &&
    targets[0].kind === 'zone' &&
    (targets[0].zone === 'field' || targets[0].zone === 'all-opponents')
  ) {
    return formatTarget(targets[0], ourTeam, opponentTeam);
  }
  return targets.map((t) => formatTarget(t, ourTeam, opponentTeam)).join(', ');
}

/** Format one battle action with correct actor/target sides (plan 05). */
export function formatBattleAction(
  action: BattleAction,
  ourTeam: Team,
  opponentTeam: Team,
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
  const targets = formatMoveTargets(action.move, action.targets, ourTeam, opponentTeam);
  const tera = action.terastallize ? ` (Tera ${action.terastallize})` : '';
  if (
    action.targets.length === 1 &&
    action.targets[0].kind === 'zone' &&
    (action.targets[0].zone === 'field' || action.targets[0].zone === 'all-opponents')
  ) {
    return `${actor} : ${action.move} (${targets})${tera}`;
  }
  return `${actor} : ${action.move} → ${targets}${tera}`;
}

export function formatActionPair(
  pair: readonly [BattleAction, BattleAction],
  ourTeam: Team,
  opponentTeam: Team,
): string {
  return `${formatBattleAction(pair[0], ourTeam, opponentTeam)} · ${formatBattleAction(pair[1], ourTeam, opponentTeam)}`;
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
      Array.isArray(obj['targets'])
    );
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

export type ActionPairFrequencyDisplay = {
  value: readonly [BattleAction, BattleAction];
  count: number;
  sampleSize: number;
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
  return { value: pair, count: obj['count'], sampleSize: obj['sampleSize'] };
}

export function formatFrequencyLabel(f: ActionPairFrequencyDisplay): string {
  const pct =
    f.sampleSize > 0 ? Math.round((f.count / f.sampleSize) * 1000) / 10 : 0;
  return `${f.count}/${f.sampleSize} (${pct} %)`;
}
