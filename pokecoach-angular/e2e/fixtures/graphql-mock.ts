import type { Page, Route } from '@playwright/test';

const SAMPLE_PASTE = `Pikachu @ Light Ball
Ability: Static
Level: 50
- Thunderbolt
- Fake Out
- Protect
- Volt Switch

Eevee @ Eviolite
Ability: Adaptability
Level: 50
- Hyper Voice
- Protect
- Helping Hand
- Tail Whip

Snorlax @ Leftovers
Ability: Gluttony
Level: 50
- Body Slam
- Protect
- Yawn
- Rest

Lucario @ Life Orb
Ability: Inner Focus
Level: 50
- Close Combat
- Protect
- Extreme Speed
- Bullet Punch

Clefairy @ Eviolite
Ability: Friend Guard
Level: 50
- Follow Me
- Protect
- Helping Hand
- After You

Togepi @ Eviolite
Ability: Super Luck
Level: 50
- Follow Me
- Protect
- Helping Hand
- Ancient Power
`;

function pokemonPayload() {
  return Array.from({ length: 6 }, (_, slot) => ({
    slot,
    species: 'Pikachu',
    moves: ['Thunderbolt', 'Protect', 'Fake Out', 'Volt Switch'],
    rawBlock: 'e2e',
  }));
}

function teamNode(id: string, name: string, kind: 'owned' | 'opponent') {
  return {
    id,
    kind,
    name,
    sourceKind: 'text',
    sourceUrl: null,
    sourceText: SAMPLE_PASTE,
    pokemon: pokemonPayload(),
    dataVersion: 1,
    createdAt: new Date().toISOString(),
    isDeleted: false,
  };
}

function teamSnapshotForRun(team: ReturnType<typeof teamNode>) {
  return {
    id: team.id,
    name: team.name,
    source: {
      kind: team.sourceKind,
      rawText: team.sourceText,
      ...(team.sourceUrl ? { url: team.sourceUrl } : {}),
    },
    pokemon: team.pokemon,
    createdAt: team.createdAt,
  };
}

export interface MockGraphqlState {
  teams: ReturnType<typeof teamNode>[];
  matchups: {
    id: string;
    ourTeamId: string;
    regulation: string | null;
    opponentTeam: ReturnType<typeof teamNode>;
    createdAt: string;
    runs: {
      id: string;
      status: string;
      processStatus: string;
      source: string;
      createdAt: string;
      finishedAt: string | null;
      targetPhase?: string | null;
    }[];
  }[];
  /** partialResult v2 keyed by run id (GetRun). */
  simulationRuns: Record<
    string,
    { matchupId: string; partialResult: Record<string, unknown> }
  >;
}

export function createMockGraphqlState(): MockGraphqlState {
  return { teams: [], matchups: [], simulationRuns: {} };
}

export async function installGraphqlMock(
  page: Page,
  state: MockGraphqlState,
): Promise<void> {
  await page.route('**/graphql', async (route: Route) => {
    const body = route.request().postDataJSON() as {
      operationName?: string;
      variables?: Record<string, unknown>;
    };
    const op = body.operationName ?? '';

    if (op === 'ListOwnedTeams') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            teams: {
              nodes: state.teams.filter((t) => t.kind === 'owned'),
              pageInfo: { endCursor: null, hasNextPage: false },
              totalCount: state.teams.length,
            },
          },
        }),
      });
      return;
    }

    if (op === 'GetOwnedTeam') {
      const id = body.variables?.['id'] as string;
      const team = state.teams.find((t) => t.id === id && t.kind === 'owned');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { team: team ?? null } }),
      });
      return;
    }

    if (op === 'CreateOwnedTeam') {
      const input = body.variables?.['input'] as {
        team: ReturnType<typeof teamNode>;
      };
      const team = input.team;
      state.teams.push(teamNode(team.id, team.name, 'owned'));
      const saved = state.teams.find((t) => t.id === team.id)!;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { createTeam: { team: saved } } }),
      });
      return;
    }

    if (op === 'ListMatchups') {
      const teamId = body.variables?.['teamId'] as string;
      const nodes = state.matchups
        .filter((m) => m.ourTeamId === teamId)
        .map((m) => ({
          id: m.id,
          ourTeamId: m.ourTeamId,
          regulation: m.regulation,
          createdAt: m.createdAt,
          opponentTeam: m.opponentTeam,
          latestSuccessfulRun: null,
          matchupRuns: { nodes: m.runs.slice(0, 1) },
        }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            matchups: {
              nodes,
              pageInfo: { endCursor: null, hasNextPage: false },
              totalCount: nodes.length,
            },
          },
        }),
      });
      return;
    }

    if (op === 'CreateOpponentMatchup') {
      const input = body.variables?.['input'] as {
        matchup: {
          id: string;
          ourTeamId: string;
          teamToOpponentTeamId: { create: ReturnType<typeof teamNode> };
        };
      };
      const m = input.matchup;
      const regulation =
        (m as { regulation?: string }).regulation ?? 'M-B';
      const opponent = teamNode(
        m.teamToOpponentTeamId.create.id,
        m.teamToOpponentTeamId.create.name,
        'opponent',
      );
      state.teams.push(opponent);
      state.matchups.push({
        id: m.id,
        ourTeamId: m.ourTeamId,
        regulation,
        opponentTeam: opponent,
        createdAt: new Date().toISOString(),
        runs: [],
      });
      const summary = {
        id: m.id,
        ourTeamId: m.ourTeamId,
        regulation,
        createdAt: new Date().toISOString(),
        opponentTeam: opponent,
        latestSuccessfulRun: null,
        matchupRuns: { nodes: [] },
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { createMatchup: { matchup: summary } },
        }),
      });
      return;
    }

    if (op === 'GetMatchup') {
      const matchupId = body.variables?.['matchupId'] as string;
      const row = state.matchups.find((m) => m.id === matchupId);
      if (!row) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { matchup: null } }),
        });
        return;
      }
      const ourTeam = state.teams.find(
        (t) => t.id === row.ourTeamId && t.kind === 'owned',
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            matchup: {
              id: row.id,
              ourTeamId: row.ourTeamId,
              opponentTeamId: row.opponentTeam.id,
              regulation: row.regulation,
              createdAt: row.createdAt,
              ourTeam,
              opponentTeam: row.opponentTeam,
              matchupRuns: { nodes: row.runs },
              latestSuccessfulRun: null,
            },
          },
        }),
      });
      return;
    }

    if (op === 'GetRun') {
      const runId = body.variables?.['runId'] as string;
      const sim = state.simulationRuns[runId];
      if (!sim) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { matchupRun: null } }),
        });
        return;
      }
      const row = state.matchups.find((m) => m.id === sim.matchupId);
      const ourTeam = row
        ? state.teams.find((t) => t.id === row.ourTeamId && t.kind === 'owned')
        : undefined;
      const summary = row?.runs.find((r) => r.id === runId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            matchupRun: {
              id: runId,
              matchupId: sim.matchupId,
              status: summary?.status ?? 'succeeded',
              processStatus: summary?.processStatus ?? 'SUCCESS',
              source: 'simulation',
              createdAt: summary?.createdAt ?? new Date().toISOString(),
              finishedAt: new Date().toISOString(),
              targetPhase: summary?.targetPhase ?? 'B',
              reportVersion: 2,
              report: null,
              partialResult: sim.partialResult,
              ourTeamSnapshot: ourTeam ? teamSnapshotForRun(ourTeam) : null,
              opponentTeamSnapshot: row?.opponentTeam
                ? teamSnapshotForRun(row.opponentTeam)
                : null,
              resultRevision: 1,
              progress: null,
              executionMetadata: {},
              provenance: {},
            },
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 500,
      body: `Unhandled GraphQL operation ${op}`,
    });
  });
}

export { SAMPLE_PASTE };
