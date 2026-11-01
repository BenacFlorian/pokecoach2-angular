import type { Team } from '../models/team.model';
import type { PokemonHighlightV2 } from '../models/simulation-result.model';

export interface GameplanHighlightDisplay {
  label: string;
  detail: string;
}

export function pokemonLabel(team: Team, slot: number): string {
  const mon = team.pokemon[slot];
  if (!mon) {
    return `Slot ${slot}`;
  }
  return mon.species || `Slot ${slot}`;
}

export function mapPokemonHighlights(
  highlights: readonly PokemonHighlightV2[],
  ours: Team,
  opponent: Team,
): GameplanHighlightDisplay[] {
  return highlights.map((item) => {
    const team = item.pokemon.side === 'ours' ? ours : opponent;
    return {
      label: pokemonLabel(team, item.pokemon.slot),
      detail: item.explanation,
    };
  });
}
