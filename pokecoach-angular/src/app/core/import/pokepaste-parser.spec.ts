import { describe, expect, it } from 'vitest';
import { PokepasteParser } from './pokepaste-parser';
import { DEMO_OPPONENT_PASTE, DEMO_OUR_TEAM_PASTE } from '../data/demo-teams';

describe('PokepasteParser', () => {
  const parser = new PokepasteParser();

  const NICKNAME_PASTE = `Chat (Incineroar) (M) @ Sitrus Berry
Ability: Intimidate
Brave Nature
- Fake Out
- Parting Shot
- Flare Blitz
- Darkest Lariat

${DEMO_OUR_TEAM_PASTE.split('\n\n').slice(1).join('\n\n')}`;

  it('parses nickname species gender item line', () => {
    const result = parser.parse(NICKNAME_PASTE);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.pokemon[0].species).toBe('Incineroar');
      expect(result.pokemon[0].nickname).toBe('Chat');
      expect(result.pokemon[0].gender).toBe('M');
    }
  });

  it('parses Reg MC demo our team paste', () => {
    const result = parser.parse(DEMO_OUR_TEAM_PASTE);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.pokemon[0].species).toBe('Farigiraf');
      expect(result.pokemon[0].nature).toBe('Calm');
    }
  });

  it('rejects empty source', () => {
    expect(parser.parse('').kind).toBe('error');
  });

  it('rejects html payload', () => {
    expect(parser.parse('<!doctype html><html></html>').kind).toBe('error');
  });

  it('rejects wrong pokemon count', () => {
    const five = DEMO_OPPONENT_PASTE.split('\n\n').slice(0, 5).join('\n\n');
    expect(parser.parse(five).kind).toBe('error');
  });

  it('parses standalone Showdown nature line', () => {
    const block = `Pikachu @ Light Ball
Ability: Static
Adamant Nature
- Thunderbolt
- Protect
- Fake Out
- Volt Switch`;
    const six = [block, block, block, block, block, block].join('\n\n');
    const result = parser.parse(six);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.pokemon[0].nature).toBe('Adamant');
    }
  });

  it('handles CRLF', () => {
    const crlf = DEMO_OPPONENT_PASTE.replace(/\n/g, '\r\n');
    expect(parser.parse(crlf).kind).toBe('success');
  });
});
