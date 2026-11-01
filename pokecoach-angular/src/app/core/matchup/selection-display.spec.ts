import { describe, expect, it } from 'vitest';
import type { LeadRecommendation } from '../models/matchup.model';
import { displayFourSlots, orderFourLeadsFirst } from './selection-display';

describe('orderFourLeadsFirst', () => {
  it('keeps lead order and sorts backs', () => {
    const four = [3, 1, 0, 2] as const;
    const lead = [1, 3] as const;
    expect(orderFourLeadsFirst(four, lead)).toEqual([1, 3, 0, 2]);
  });

  it('matches displayFourSlots on recommendation', () => {
    const rec: LeadRecommendation = {
      ourFourSlots: [2, 0, 1, 3],
      ourLeadSlots: [0, 2],
      justification: '',
      selectionResults: [],
      studiedLeads: [],
    };
    expect(displayFourSlots(rec)).toEqual([0, 2, 1, 3]);
  });
});
