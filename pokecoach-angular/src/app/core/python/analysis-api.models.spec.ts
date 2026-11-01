import { describe, expect, it } from 'vitest';
import { mapCapabilitiesView } from './analysis-api.models';

describe('mapCapabilitiesView', () => {
  it('targets synthesis when LLM is configured', () => {
    const view = mapCapabilitiesView({
      phases: ['A', 'C', 'B', 'D'],
      profiles: ['standard', 'smoke'],
      regulations: ['M-B'],
      synthesisAvailable: true,
    });
    expect(view.defaultTargetPhase).toBe('synthesis');
  });

  it('stops at D when synthesis is unavailable', () => {
    const view = mapCapabilitiesView({
      phases: ['A', 'C', 'B', 'D'],
      profiles: ['standard', 'smoke'],
      regulations: ['M-B'],
      synthesisAvailable: false,
    });
    expect(view.defaultTargetPhase).toBe('D');
  });
});
