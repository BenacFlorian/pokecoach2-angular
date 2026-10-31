export interface GqlPageInfo {
  endCursor: string | null;
  hasNextPage: boolean;
}

export interface GqlTeamNode {
  id: string;
  kind: string;
  name: string;
  sourceKind: string;
  sourceUrl: string | null;
  sourceText: string;
  pokemon: unknown;
  dataVersion: number;
  createdAt: string;
  isDeleted: boolean;
}

export interface GqlRunNode {
  id: string;
  status: string;
  processStatus: string;
  source: string | null;
  reportVersion: number | null;
  report: unknown;
  ourTeamSnapshot: unknown;
  opponentTeamSnapshot: unknown;
  createdAt: string;
  finishedAt: string | null;
}

export interface GqlMatchupNode {
  id: string;
  ourTeamId: string;
  opponentTeamId: string;
  createdAt: string;
  isDeleted: boolean;
  opponentTeam: GqlTeamNode | null;
  latestSuccessfulRun: GqlRunNode | null;
  matchupRuns: {
    nodes: GqlRunNode[];
  };
  ourTeam: GqlTeamNode | null;
}

export interface GqlTeamsConnection {
  teams: {
    nodes: GqlTeamNode[];
    pageInfo: GqlPageInfo;
    totalCount: number;
  };
}

export interface GqlTeamById {
  team: GqlTeamNode | null;
}

export interface GqlMatchupsConnection {
  matchups: {
    nodes: GqlMatchupNode[];
    pageInfo: GqlPageInfo;
    totalCount: number;
  };
}

export interface GqlMatchupById {
  matchup: GqlMatchupNode | null;
}

export interface GqlCreateTeamPayload {
  createTeam: {
    team: GqlTeamNode;
  } | null;
}

export interface GqlCreateMatchupPayload {
  createMatchup: {
    matchup: GqlMatchupNode;
  } | null;
}
