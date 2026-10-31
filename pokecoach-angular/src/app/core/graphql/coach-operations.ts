export const TEAM_FIELDS = `
  id
  kind
  name
  sourceKind
  sourceUrl
  sourceText
  pokemon
  dataVersion
  createdAt
  isDeleted
`;

export const RUN_SUMMARY_FIELDS = `
  id
  status
  processStatus
  source
  createdAt
  finishedAt
  targetPhase
`;

export const RUN_PROGRESS_FIELDS = `
  partialResult
  resultRevision
  progress
  executionMetadata
  provenance
`;

export const RUN_DETAIL_FIELDS = `
  ${RUN_SUMMARY_FIELDS}
  reportVersion
  report
  ourTeamSnapshot
  opponentTeamSnapshot
  ${RUN_PROGRESS_FIELDS}
`;

export const LIST_OWNED_TEAMS = `
  query ListOwnedTeams($after: Cursor) {
    teams(
      first: 50
      after: $after
      condition: { kind: "owned", isDeleted: false }
      orderBy: [CREATED_AT_DESC, ID_DESC]
    ) {
      nodes {
        ${TEAM_FIELDS}
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`;

export const GET_OWNED_TEAM = `
  query GetOwnedTeam($id: UUID!) {
    team(id: $id) {
      ${TEAM_FIELDS}
    }
  }
`;

export const LIST_MATCHUPS = `
  query ListMatchups($teamId: UUID!, $after: Cursor) {
    matchups(
      first: 50
      after: $after
      condition: { ourTeamId: $teamId, isDeleted: false }
      orderBy: [CREATED_AT_DESC, ID_DESC]
    ) {
      nodes {
        id
        ourTeamId
        regulation
        createdAt
        opponentTeam {
          ${TEAM_FIELDS}
        }
        latestSuccessfulRun {
          id
        }
        matchupRuns(first: 1, orderBy: [CREATED_AT_DESC, ID_DESC]) {
          nodes {
            ${RUN_SUMMARY_FIELDS}
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`;

export const GET_MATCHUP = `
  query GetMatchup($matchupId: UUID!) {
    matchup(id: $matchupId) {
      id
      ourTeamId
      opponentTeamId
      regulation
      createdAt
      ourTeam {
        ${TEAM_FIELDS}
      }
      opponentTeam {
        ${TEAM_FIELDS}
      }
      matchupRuns(first: 20, orderBy: [CREATED_AT_DESC, ID_DESC]) {
        nodes {
          ${RUN_SUMMARY_FIELDS}
          ${RUN_PROGRESS_FIELDS}
        }
      }
      latestSuccessfulRun {
        ${RUN_DETAIL_FIELDS}
      }
    }
  }
`;

export const GET_RUN = `
  query GetRun($runId: UUID!) {
    matchupRun(id: $runId) {
      matchupId
      ${RUN_DETAIL_FIELDS}
    }
  }
`;

export const CREATE_OWNED_TEAM = `
  mutation CreateOwnedTeam($input: CreateTeamInput!) {
    createTeam(input: $input) {
      team {
        ${TEAM_FIELDS}
      }
    }
  }
`;

export const CREATE_OPPONENT_MATCHUP = `
  mutation CreateOpponentMatchup($input: CreateMatchupInput!) {
    createMatchup(input: $input) {
      matchup {
        id
        ourTeamId
        regulation
        opponentTeamId
        createdAt
        opponentTeam {
          ${TEAM_FIELDS}
        }
        latestSuccessfulRun {
          id
        }
        matchupRuns(first: 1, orderBy: [CREATED_AT_DESC, ID_DESC]) {
          nodes {
            ${RUN_SUMMARY_FIELDS}
          }
        }
      }
    }
  }
`;

export const UPDATE_MATCHUP_REGULATION = `
  mutation UpdateMatchupRegulation($input: UpdateMatchupInput!) {
    updateMatchup(input: $input) {
      matchup {
        id
        regulation
      }
    }
  }
`;
