import type { LeadRecommendation } from '../models/matchup.model';
import type { PokemonSlot } from '../models/team.model';

/** Lead slots in order, then back slots sorted by index. */
export function orderFourLeadsFirst(
  four: readonly [number, number, number, number],
  lead: readonly [number, number],
): readonly [PokemonSlot, PokemonSlot, PokemonSlot, PokemonSlot] {
  const leadA = lead[0] as PokemonSlot;
  const leadB = lead[1] as PokemonSlot;
  const leadSet = new Set<PokemonSlot>([leadA, leadB]);
  const backs = (four as readonly PokemonSlot[])
    .filter((s): s is PokemonSlot => !leadSet.has(s))
    .sort((a, b) => a - b);
  return [leadA, leadB, backs[0], backs[1]];
}

export function displayFourSlots(rec: LeadRecommendation): readonly PokemonSlot[] {
  return orderFourLeadsFirst(rec.ourFourSlots, rec.ourLeadSlots);
}
