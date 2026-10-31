import { PokepasteParser } from '../import/pokepaste-parser';
import type { ImportedTeam, Team } from '../models/team.model';

const parser = new PokepasteParser();

/** https://pokepast.es/9d3c3ee9e145f6b8 — Chompy, VR October Challenge Top 4 (Reg MC) */
export const DEMO_OUR_TEAM_PASTE = `
Farigiraf @ Sitrus Berry
Ability: Armor Tail
Level: 50
EVs: 29 HP / 22 Def / 15 SpD
Calm Nature
- Protect
- Psychic
- Trick Room
- Helping Hand

Camerupt @ Cameruptite
Ability: Solid Rock
Level: 50
EVs: 32 HP / 2 Def / 32 SpA
Quiet Nature
- Protect
- Heat Wave
- Ancient Power
- Earth Power

Sylveon @ Fairy Feather
Ability: Pixilate
Level: 50
EVs: 31 HP / 13 Def / 21 SpA / 1 SpD
Modest Nature
- Protect
- Moonblast
- Hyper Voice
- Calm Mind

Raichu @ Raichunite Y
Ability: Lightning Rod
Level: 50
EVs: 30 HP / 12 Def / 24 Spe
Timid Nature
- Protect
- Fake Out
- Zap Cannon
- Focus Blast

Incineroar @ Charcoal
Ability: Intimidate
Level: 50
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Fake Out
- Parting Shot
- Flare Blitz
- Darkest Lariat

Rillaboom @ Life Orb
Ability: Grassy Surge
Level: 50
EVs: 32 HP / 27 Atk / 6 SpD / 1 Spe
Adamant Nature
- Grassy Glide
- Fake Out
- Wood Hammer
- U-turn
`.trim();

/** https://pokepast.es/a3405a6e98d765aa — Nirinbo, Battle Cruise Top 8 (Reg MC) */
export const DEMO_OPPONENT_PASTE = `
Salamence @ Salamencite
Ability: Intimidate
Level: 50
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Hyper Voice
- Draco Meteor
- Tailwind
- Protect

Kingambit @ Life Orb
Ability: Defiant
Level: 50
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Kowtow Cleave
- Sucker Punch
- Swords Dance
- Protect

Glimmora @ Glimmoranite
Ability: Toxic Debris
Level: 50
EVs: 32 SpA / 2 SpD / 32 Spe
Modest Nature
- Power Gem
- Sludge Bomb
- Earth Power
- Spiky Shield

Rillaboom @ Miracle Seed
Ability: Grassy Surge
Level: 50
EVs: 32 HP / 30 Atk / 4 Spe
Adamant Nature
- Superpower
- Grassy Glide
- Wood Hammer
- Fake Out

Volcarona @ Charti Berry
Ability: Flame Body
Level: 50
EVs: 32 HP / 20 Def / 14 Spe
Bold Nature
- Overheat
- Struggle Bug
- Rage Powder
- Protect

Garchomp @ Choice Scarf
Ability: Rough Skin
Level: 50
EVs: 14 HP / 20 Atk / 32 Spe
Adamant Nature
- Earthquake
- Rock Slide
- Stomping Tantrum
- Dragon Claw
`.trim();

export const DEMO_OUR_POKEPASTE_URL = 'https://pokepast.es/9d3c3ee9e145f6b8';
export const DEMO_OPPONENT_POKEPASTE_URL = 'https://pokepast.es/a3405a6e98d765aa';

function parsePaste(raw: string, url?: string): ImportedTeam {
  const result = parser.parse(raw);
  if (result.kind === 'error') {
    throw new Error(result.messages.join(' '));
  }
  return {
    source: { kind: 'text', rawText: raw, url },
    pokemon: result.pokemon,
    warnings: result.warnings,
  };
}

export function buildDemoTeam(
  id: string,
  name: string,
  imported: ImportedTeam,
  createdAt: string,
): Team {
  return {
    id,
    name,
    source: imported.source,
    pokemon: imported.pokemon,
    createdAt,
  };
}

export const DEMO_IMPORTED_OUR = parsePaste(
  DEMO_OUR_TEAM_PASTE,
  DEMO_OUR_POKEPASTE_URL,
);
export const DEMO_IMPORTED_OPPONENT = parsePaste(
  DEMO_OPPONENT_PASTE,
  DEMO_OPPONENT_POKEPASTE_URL,
);

export const DEMO_TEAM_WITH_MATCHUP = buildDemoTeam(
  'demo-team-matchup',
  'Chompy — VR Top 4 (Reg MC)',
  DEMO_IMPORTED_OUR,
  '2026-10-01T10:00:00.000Z',
);

/** Deuxième équipe Reg MC sans matchup préparé (même paste que l’adversaire du rapport démo). */
export const DEMO_TEAM_EMPTY = buildDemoTeam(
  'demo-team-empty',
  'Nirinbo — Battle Cruise Top 8',
  DEMO_IMPORTED_OPPONENT,
  '2026-10-01T11:00:00.000Z',
);

export const DEMO_OPPONENT_TEAM = buildDemoTeam(
  'demo-opponent-nirinbo',
  'Nirinbo — Battle Cruise Top 8',
  DEMO_IMPORTED_OPPONENT,
  '2026-10-01T10:05:00.000Z',
);
