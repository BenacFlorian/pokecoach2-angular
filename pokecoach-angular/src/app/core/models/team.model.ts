export type TeamInput =
  | { kind: 'url'; value: string }
  | { kind: 'text'; value: string };

export type PokemonSlot = 0 | 1 | 2 | 3 | 4 | 5;

export interface PokemonSet {
  slot: PokemonSlot;
  species: string;
  nickname?: string;
  gender?: 'M' | 'F';
  item?: string;
  ability?: string;
  level?: number;
  teraType?: string;
  nature?: string;
  evs?: Record<string, number>;
  ivs?: Record<string, number>;
  moves: string[];
  rawBlock: string;
}

export type TeamSourceKind = 'url' | 'text';

export interface TeamSource {
  kind: TeamSourceKind;
  rawText: string;
  url?: string;
}

export interface ImportedTeam {
  source: TeamSource;
  pokemon: readonly [
    PokemonSet,
    PokemonSet,
    PokemonSet,
    PokemonSet,
    PokemonSet,
    PokemonSet,
  ];
  warnings: readonly string[];
}

export interface Team {
  id: string;
  name: string;
  source: TeamSource;
  pokemon: readonly [
    PokemonSet,
    PokemonSet,
    PokemonSet,
    PokemonSet,
    PokemonSet,
    PokemonSet,
  ];
  createdAt: string;
}

export function pokemonTuple(
  sets: PokemonSet[],
): ImportedTeam['pokemon'] {
  if (sets.length !== 6) {
    throw new Error(`Expected 6 Pokémon, got ${sets.length}`);
  }
  return sets as unknown as ImportedTeam['pokemon'];
}
