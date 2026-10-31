import { describe, expect, it } from 'vitest';
import {
  formatNatureWithModifiers,
  getNatureModifiers,
} from './pokemon-natures';

describe('pokemon-natures', () => {
  it('formats Timid as +Spe −Atk', () => {
    expect(formatNatureWithModifiers('Timid')).toBe('Timid (+Spe −Atk)');
  });

  it('formats Adamant as +Atk −SpA', () => {
    expect(formatNatureWithModifiers('Adamant')).toBe('Adamant (+Atk −SpA)');
  });

  it('returns name only for neutral nature', () => {
    expect(formatNatureWithModifiers('Hardy')).toBe('Hardy');
  });

  it('resolves modifiers lookup', () => {
    expect(getNatureModifiers('Calm')).toEqual({ plus: 'SpD', minus: 'Atk' });
  });
});
