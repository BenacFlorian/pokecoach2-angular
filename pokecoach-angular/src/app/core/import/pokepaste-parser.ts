import {
  pokemonTuple,
  type ImportedTeam,
  type PokemonSet,
  type PokemonSlot,
} from '../models/team.model';

export type ParseError = {
  kind: 'error';
  messages: readonly string[];
};

export type ParseSuccess = {
  kind: 'success';
  pokemon: ImportedTeam['pokemon'];
  warnings: readonly string[];
};

export type ParseResult = ParseError | ParseSuccess;

const STAT_KEYS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'] as const;

export class PokepasteParser {
  parse(rawText: string): ParseResult {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return { kind: 'error', messages: ['La source est vide.'] };
    }
    if (looksLikeHtml(trimmed)) {
      return {
        kind: 'error',
        messages: ['La source ressemble à une page HTML, pas à un paste Showdown.'],
      };
    }

    const normalized = trimmed.replace(/\r\n/g, '\n');
    const blocks = normalized
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);

    if (blocks.length !== 6) {
      return {
        kind: 'error',
        messages: [
          `Six Pokémon attendus, ${blocks.length} bloc${blocks.length > 1 ? 's' : ''} trouvé${blocks.length > 1 ? 's' : ''}.`,
        ],
      };
    }

    const warnings: string[] = [];
    const pokemon: PokemonSet[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const blockResult = parseBlock(blocks[i], i as PokemonSlot);
      if ('error' in blockResult) {
        return {
          kind: 'error',
          messages: [`Bloc ${i + 1} : ${blockResult.error}`],
        };
      }
      pokemon.push(blockResult.set);
      warnings.push(...blockResult.warnings);
    }

    return {
      kind: 'success',
      pokemon: pokemonTuple(pokemon),
      warnings,
    };
  }
}

function looksLikeHtml(text: string): boolean {
  const sample = text.slice(0, 500).toLowerCase();
  return sample.includes('<!doctype') || sample.includes('<html');
}

function parseBlock(
  block: string,
  slot: PokemonSlot,
): { set: PokemonSet; warnings: string[] } | { error: string } {
  const lines = block.split('\n').map((l) => l.trim());
  if (!lines[0]) {
    return { error: 'première ligne manquante' };
  }

  const header = parseHeaderLine(lines[0]);
  if (!header.species) {
    return { error: 'espèce non reconnue sur la première ligne' };
  }

  const moves: string[] = [];
  const warnings: string[] = [];
  let ability: string | undefined;
  let level: number | undefined;
  let teraType: string | undefined;
  let nature: string | undefined;
  let evs: Record<string, number> | undefined;
  let ivs: Record<string, number> | undefined;

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) {
      continue;
    }
    if (line.startsWith('- ')) {
      moves.push(line.slice(2).trim());
      continue;
    }
    if (line.startsWith('Ability:')) {
      ability = line.slice('Ability:'.length).trim();
      continue;
    }
    if (line.startsWith('Level:')) {
      level = Number.parseInt(line.slice('Level:'.length).trim(), 10);
      continue;
    }
    if (line.startsWith('Tera Type:')) {
      teraType = line.slice('Tera Type:'.length).trim();
      continue;
    }
    if (line.startsWith('Nature:')) {
      nature = line.slice('Nature:'.length).trim();
      continue;
    }
    const natureLine = line.match(/^([A-Za-z-]+) Nature$/);
    if (natureLine) {
      nature = natureLine[1];
      continue;
    }
    if (line.startsWith('EVs:')) {
      evs = parseStats(line.slice('EVs:'.length));
      continue;
    }
    if (line.startsWith('IVs:')) {
      ivs = parseStats(line.slice('IVs:'.length));
      continue;
    }
    warnings.push(`Ligne ignorée : ${line}`);
  }

  return {
    set: {
      slot,
      species: header.species,
      nickname: header.nickname,
      gender: header.gender,
      item: header.item,
      ability,
      level,
      teraType,
      nature,
      evs,
      ivs,
      moves,
      rawBlock: block,
    },
    warnings,
  };
}

function parseHeaderLine(line: string): {
  species: string;
  nickname?: string;
  gender?: 'M' | 'F';
  item?: string;
} {
  let rest = line.trim();
  let item: string | undefined;
  const atIdx = rest.indexOf(' @ ');
  if (atIdx >= 0) {
    item = rest.slice(atIdx + 3).trim();
    rest = rest.slice(0, atIdx).trim();
  }

  let gender: 'M' | 'F' | undefined;
  const genderMatch = rest.match(/ \(([MF])\)$/);
  if (genderMatch) {
    gender = genderMatch[1] as 'M' | 'F';
    rest = rest.slice(0, -genderMatch[0].length);
  }

  const nickMatch = rest.match(/^(.+) \(([^()]+)\)$/);
  if (nickMatch) {
    return {
      nickname: nickMatch[1].trim(),
      species: nickMatch[2].trim(),
      gender,
      item,
    };
  }

  return { species: rest.trim(), gender, item };
}

function parseStats(fragment: string): Record<string, number> {
  const out: Record<string, number> = {};
  const parts = fragment.split('/').map((p) => p.trim());
  for (const part of parts) {
    const match = part.match(/^(\d+)\s+(\w+)$/);
    if (match) {
      out[match[2]] = Number.parseInt(match[1], 10);
    }
  }
  for (const key of STAT_KEYS) {
    if (!(key in out)) {
      // partial EV lines still valid
    }
  }
  return out;
}

export function importedTeamFromText(
  rawText: string,
  kind: 'text' | 'url',
  url?: string,
): ParseResult & { imported?: ImportedTeam } {
  const parser = new PokepasteParser();
  const result = parser.parse(rawText);
  if (result.kind === 'error') {
    return result;
  }
  return {
    ...result,
    imported: {
      source: { kind, rawText, url },
      pokemon: result.pokemon,
      warnings: result.warnings,
    },
  };
}
