import { PokepasteParser } from '../../app/core/import/pokepaste-parser';
import type { ImportedTeam, Team } from '../../app/core/models/team.model';

const parser = new PokepasteParser();

/** https://pokepast.es/e46c2a79dcd8d00c — jit_vgc Worlds 2026 (Reg MB) */
export const DEMO_OUR_TEAM_PASTE = `
Excadrill (F) @ Focus Sash
Ability: Sand Rush
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- High Horsepower
- Rock Slide
- Iron Head
- Protect

Tyranitar (M) @ Tyranitarite
Ability: Sand Stream
Level: 50
EVs: 16 HP / 18 Atk / 32 Spe
Jolly Nature
- Rock Slide
- Protect
- Knock Off
- Low Kick

Sinistcha @ Colbur Berry
Ability: Hospitality
Level: 50
EVs: 29 HP / 15 Def / 22 SpD
Bold Nature
- Rage Powder
- Trick Room
- Matcha Gotcha
- Protect

Staraptor (M) @ Staraptite
Ability: Intimidate
Level: 50
EVs: 21 HP / 11 Atk / 2 SpD / 32 Spe
Jolly Nature
- Brave Bird
- Tailwind
- Protect
- Close Combat

Milotic (M) @ Sitrus Berry
Ability: Competitive
Level: 50
EVs: 30 HP / 21 Def / 2 SpD / 13 Spe
Bold Nature
- Scald
- Icy Wind
- Ice Beam
- Protect

Gholdengo @ Life Orb
Ability: Good as Gold
Level: 50
EVs: 27 HP / 13 Def / 7 SpA / 10 SpD / 9 Spe
Modest Nature
- Make It Rain
- Shadow Ball
- Nasty Plot
- Protect
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

export const DEMO_OUR_POKEPASTE_URL = 'https://pokepast.es/e46c2a79dcd8d00c';
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
  'jit_vgc — Worlds 2026 (Reg MB)',
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
