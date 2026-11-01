import { describe, expect, it } from 'vitest';
import {
  DEMO_IMPORTED_OPPONENT,
  DEMO_IMPORTED_OUR,
} from '../../../testing/fixtures/demo-teams';
import { formatBattleAction, formatActionPair } from './battle-action-display';
import type { BattleAction } from '../models/matchup.model';

import type { Team } from '../models/team.model';

function asTeam(imported: typeof DEMO_IMPORTED_OUR): Team {
  return {
    id: 'test-team',
    name: 'Test',
    source: { kind: 'text', rawText: 'x' },
    pokemon: imported.pokemon,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

describe('formatBattleAction', () => {
  const ours = asTeam(DEMO_IMPORTED_OUR);
  const opp = asTeam(DEMO_IMPORTED_OPPONENT);

  it('formats opponent actor and our target', () => {
    const action: BattleAction = {
      kind: 'move',
      actor: { side: 'opponent', slot: 0 },
      move: 'Fake Out',
      targets: [{ kind: 'pokemon', ref: { side: 'ours', slot: 0 } }],
    };
    expect(formatBattleAction(action, ours, opp)).toContain(opp.pokemon[0]!.species);
    expect(formatBattleAction(action, ours, opp)).toContain(ours.pokemon[0]!.species);
  });

  it('formats field moves without a fake pokemon target', () => {
    const action: BattleAction = {
      kind: 'move',
      actor: { side: 'ours', slot: 0 },
      move: 'Tailwind',
      targets: [{ kind: 'zone', zone: 'field' }],
    };
    expect(formatBattleAction(action, ours, opp)).toBe('Excadrill : Tailwind (terrain)');
  });

  it('formats a simultaneous pair', () => {
    const pair: readonly [BattleAction, BattleAction] = [
      {
        kind: 'move',
        actor: { side: 'ours', slot: 0 },
        move: 'Protect',
        targets: [{ kind: 'pokemon', ref: { side: 'ours', slot: 0 } }],
      },
      {
        kind: 'move',
        actor: { side: 'ours', slot: 1 },
        move: 'Tailwind',
        targets: [{ kind: 'zone', zone: 'field' }],
      },
    ];
    expect(formatActionPair(pair, ours, opp).split(' · ').length).toBe(2);
  });
});
