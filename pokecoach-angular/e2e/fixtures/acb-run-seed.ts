import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MockGraphqlState } from './graphql-mock';

const ACB_PATH = join(
  process.cwd(),
  '../../pokecoach2-python/contracts/examples/openings/acb.json',
);

export const E2E_ACB_RUN_ID = 'a1111111-1111-4111-8111-111111111101';

export function loadAcbPartialResult(): Record<string, unknown> {
  return JSON.parse(readFileSync(ACB_PATH, 'utf-8')) as Record<string, unknown>;
}

/** Attache un run simulation ACB réussi au matchup déjà présent dans le state. */
export function attachAcbRunToMatchup(
  state: MockGraphqlState,
  matchupId: string,
  runId = E2E_ACB_RUN_ID,
): void {
  const row = state.matchups.find((m) => m.id === matchupId);
  if (!row) {
    throw new Error(`matchup ${matchupId} missing from mock state`);
  }
  state.simulationRuns[runId] = {
    matchupId,
    partialResult: loadAcbPartialResult(),
  };
  row.runs = [
    {
      id: runId,
      status: 'succeeded',
      processStatus: 'SUCCESS',
      source: 'simulation',
      createdAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      targetPhase: 'B',
    },
  ];
}
