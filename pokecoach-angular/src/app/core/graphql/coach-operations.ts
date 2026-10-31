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
`;

export const RUN_DETAIL_FIELDS = `
  ${RUN_SUMMARY_FIELDS}
  reportVersion
  report
  ourTeamSnapshot
  opponentTeamSnapshot
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
      createdAt
      ourTeam {
        ${TEAM_FIELDS}
      }
      opponentTeam {
        ${TEAM_FIELDS}
      }
      matchupRuns(first: 1, orderBy: [CREATED_AT_DESC, ID_DESC]) {
        nodes {
          ${RUN_SUMMARY_FIELDS}
        }
      }
      latestSuccessfulRun {
        ${RUN_DETAIL_FIELDS}
      }
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
