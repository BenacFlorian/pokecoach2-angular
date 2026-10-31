import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { ImportedTeam, Team } from '../models/team.model';
import type {
  GqlCreateMatchupPayload,
  GqlCreateTeamPayload,
  GqlMatchupById,
  GqlMatchupsConnection,
  GqlRunById,
  GqlTeamById,
  GqlTeamsConnection,
} from './coach-dto';
import {
  CREATE_OPPONENT_MATCHUP,
  CREATE_OWNED_TEAM,
  GET_MATCHUP,
  GET_OWNED_TEAM,
  GET_RUN,
  LIST_MATCHUPS,
  LIST_OWNED_TEAMS,
} from './coach-operations';
import { GraphqlClient } from './graphql-client';
import {
  mapMatchupDetail,
  mapMatchupSummary,
  mapSimulationRunView,
  mapTeamNode,
  teamInputFromImported,
  type MatchupDetail,
  type MatchupSummary,
  type Page,
  type SelectedRunView,
} from './coach-mappers';

@Injectable({ providedIn: 'root' })
export class CoachApi {
  private readonly gql = inject(GraphqlClient);

  listOwnedTeams(after?: string): Observable<Page<Team>> {
    return this.gql
      .execute<GqlTeamsConnection>('ListOwnedTeams', LIST_OWNED_TEAMS, {
        after: after ?? null,
      })
      .pipe(
        map((data) => {
          const conn = data.teams;
          const items = conn.nodes
            .map((n) => mapTeamNode(n, 'owned'))
            .filter((t): t is Team => t !== null);
          return {
            items,
            endCursor: conn.pageInfo.endCursor,
            hasNextPage: conn.pageInfo.hasNextPage,
          };
        }),
      );
  }

  getOwnedTeam(id: string): Observable<Team | null> {
    return this.gql
      .execute<GqlTeamById>('GetOwnedTeam', GET_OWNED_TEAM, { id })
      .pipe(map((data) => mapTeamNode(data.team, 'owned')));
  }

  listMatchups(teamId: string, after?: string): Observable<Page<MatchupSummary>> {
    return this.gql
      .execute<GqlMatchupsConnection>('ListMatchups', LIST_MATCHUPS, {
        teamId,
        after: after ?? null,
      })
      .pipe(
        map((data) => {
          const conn = data.matchups;
          const items = conn.nodes
            .map((n) => mapMatchupSummary(n))
            .filter((m): m is MatchupSummary => m !== null);
          return {
            items,
            endCursor: conn.pageInfo.endCursor,
            hasNextPage: conn.pageInfo.hasNextPage,
          };
        }),
      );
  }

  getMatchup(teamId: string, matchupId: string): Observable<MatchupDetail | null> {
    return this.gql
      .execute<GqlMatchupById>('GetMatchup', GET_MATCHUP, { matchupId })
      .pipe(map((data) => (data.matchup ? mapMatchupDetail(data.matchup, teamId) : null)));
  }

  getRun(
    teamId: string,
    matchupId: string,
    runId: string,
  ): Observable<SelectedRunView> {
    return this.gql.execute<GqlRunById>('GetRun', GET_RUN, { runId }).pipe(
      map((data) => mapSimulationRunView(data.matchupRun, matchupId)),
    );
  }

  createOwnedTeam(
    requestId: string,
    name: string,
    imported: ImportedTeam,
  ): Observable<Team> {
    const team = teamInputFromImported(requestId, 'owned', name, imported);
    return this.gql
      .execute<GqlCreateTeamPayload>('CreateOwnedTeam', CREATE_OWNED_TEAM, {
        input: { team },
      })
      .pipe(
        map((data) => {
          const mapped = mapTeamNode(data.createTeam?.team, 'owned');
          if (!mapped) {
            throw new Error('Réponse équipe invalide.');
          }
          return mapped;
        }),
      );
  }

  createOpponentMatchup(
    ids: { matchupId: string; opponentId: string },
    teamId: string,
    name: string,
    imported: ImportedTeam,
  ): Observable<MatchupSummary> {
    const opponent = teamInputFromImported(
      ids.opponentId,
      'opponent',
      name,
      imported,
    );
    return this.gql
      .execute<GqlCreateMatchupPayload>(
        'CreateOpponentMatchup',
        CREATE_OPPONENT_MATCHUP,
        {
          input: {
            matchup: {
              id: ids.matchupId,
              ourTeamId: teamId,
              teamToOpponentTeamId: { create: opponent },
            },
          },
        },
      )
      .pipe(
        map((data) => {
          const node = data.createMatchup?.matchup;
          if (!node) {
            throw new Error('Réponse matchup invalide.');
          }
          const mapped = mapMatchupSummary(node);
          if (!mapped || mapped.teamId !== teamId) {
            throw new Error('Réponse matchup invalide.');
          }
          return mapped;
        }),
      );
  }
}
