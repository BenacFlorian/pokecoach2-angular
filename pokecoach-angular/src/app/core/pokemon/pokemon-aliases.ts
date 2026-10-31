/**
 * Normalise un nom d’espèce Showdown avant appel PokéAPI.
 * Compléter SHOWDOWN_TO_POKEAPI au fil des cas régionaux / sexe / forme.
 */
const SHOWDOWN_TO_POKEAPI: Record<string, string> = {
  'Urshifu-Rapid-Strike': 'urshifu-rapid-strike',
  'Urshifu-Rapid-Strike-Gmax': 'urshifu-rapid-strike-gmax',
  'Urshifu-Single-Strike': 'urshifu-single-strike',
  'Ogerpon-Wellspring': 'ogerpon-wellspring-mask',
  'Ogerpon-Hearthflame': 'ogerpon-hearthflame-mask',
  'Ogerpon-Cornerstone': 'ogerpon-cornerstone-mask',
  Ogerpon: 'ogerpon-teal-mask',
  'Indeedee-F': 'indeedee-female',
  'Indeedee-M': 'indeedee-male',
  'Basculegion-F': 'basculegion-female',
  'Basculegion-M': 'basculegion-male',
  'Tauros-Paldea-Combat': 'tauros-paldea-combat-breed',
  'Tauros-Paldea-Blaze': 'tauros-paldea-blaze-breed',
  'Tauros-Paldea-Aqua': 'tauros-paldea-aqua-breed',
};

export function sanitizeShowdownSpeciesForPokeApi(species: string): string {
  const trimmed = species.trim();
  const mapped = SHOWDOWN_TO_POKEAPI[trimmed];
  if (mapped) {
    return mapped;
  }
  return trimmed
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/['’]/g, '')
    .replace(/:/g, '')
    .replace(/\s+/g, '-');
}

/** @deprecated Préférer sanitizeShowdownSpeciesForPokeApi */
export const showdownSpeciesToPokeApiId = sanitizeShowdownSpeciesForPokeApi;
