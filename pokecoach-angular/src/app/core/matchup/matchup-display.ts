import type { PokemonSlot, Team } from '../models/team.model';

/** Identifiant stable pour sélectionner un lead dans les rapports. */
export function opponentLeadId(
  team: Team,
  leadSlots: readonly [PokemonSlot, PokemonSlot],
): string {
  const a = slugSpecies(team.pokemon[leadSlots[0]].species);
  const b = slugSpecies(team.pokemon[leadSlots[1]].species);
  return `lead-${a}-${b}`;
}

export function formatOpponentLeadLabel(
  team: Team,
  leadSlots: readonly [PokemonSlot, PokemonSlot],
): string {
  const n1 = team.pokemon[leadSlots[0]].species;
  const n2 = team.pokemon[leadSlots[1]].species;
  return `Lead ${n1} ${n2}`;
}

export function opponentLeadLabelById(
  team: Team,
  leads: readonly { id: string; leadSlots: readonly [PokemonSlot, PokemonSlot] }[],
  leadId: string,
): string {
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) {
    return leadId;
  }
  return formatOpponentLeadLabel(team, lead.leadSlots);
}

function slugSpecies(species: string): string {
  return species
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatPercent(count: number, sampleSize: number): string {
  if (sampleSize === 0) {
    return 'Données indisponibles';
  }
  return `${((count / sampleSize) * 100).toFixed(1)} %`;
}

export function formatFrequencyPercent(f: {
  count: number;
  sampleSize: number;
}): string {
  return formatPercent(f.count, f.sampleSize);
}
