import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import type { ImportedTeam, Team } from '../models/team.model';
import { CoachApi } from '../graphql/coach-api';
import { userMessageForGraphqlError } from '../graphql/graphql-error';
import type { MatchupDetail, MatchupSummary, Page, SelectedRunView } from '../graphql/coach-mappers';
import { isUuid } from '../graphql/coach-mappers';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error' | 'not-found';

export interface ListResource<T> {
  state: LoadState;
  items: T[];
  error: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
  loadingMore: boolean;
}

export interface DetailResource<T> {
  state: LoadState;
  value: T | null;
  error: string | null;
}

function emptyList<T>(): ListResource<T> {
  return {
    state: 'idle',
    items: [],
    error: null,
    endCursor: null,
    hasNextPage: false,
    loadingMore: false,
  };
}

function emptyDetail<T>(): DetailResource<T> {
  return { state: 'idle', value: null, error: null };
}

@Injectable({ providedIn: 'root' })
export class CoachStore {
  private readonly api = inject(CoachApi);

  private readonly teamsResource = signal<ListResource<Team>>(emptyList());
  private readonly teamDetailResource = signal<DetailResource<Team>>(emptyDetail());
  private readonly matchupsResource = signal<ListResource<MatchupSummary>>(emptyList());
  private readonly matchupDetailResource = signal<DetailResource<MatchupDetail>>(emptyDetail());

  private teamsRequestGen = 0;
  private teamDetailGen = 0;
  private teamDetailKey = '';
  private matchupsRequestGen = 0;
  private matchupsTeamKey = '';
  private matchupDetailGen = 0;
  private matchupDetailKey = '';

  private selectedRunResource = signal<DetailResource<SelectedRunView>>(emptyDetail());
  private selectedRunGen = 0;
  private selectedRunKey = '';
  private selectedRunRevision = -1;

  private teamsSub: Subscription | null = null;
  private teamSub: Subscription | null = null;
  private matchupsSub: Subscription | null = null;
  private matchupSub: Subscription | null = null;
  private selectedRunSub: Subscription | null = null;

  readonly teamsState = computed(() => this.teamsResource().state);
  readonly teams = computed(() => this.teamsResource().items);
  readonly teamsError = computed(() => this.teamsResource().error);
  readonly teamsHasNextPage = computed(() => this.teamsResource().hasNextPage);
  readonly teamsLoadingMore = computed(() => this.teamsResource().loadingMore);

  readonly teamDetailState = computed(() => this.teamDetailResource().state);
  readonly teamDetail = computed(() => this.teamDetailResource().value);
  readonly teamDetailError = computed(() => this.teamDetailResource().error);

  readonly matchupsState = computed(() => this.matchupsResource().state);
  readonly matchups = computed(() => this.matchupsResource().items);
  readonly matchupsError = computed(() => this.matchupsResource().error);
  readonly matchupsHasNextPage = computed(() => this.matchupsResource().hasNextPage);
  readonly matchupsLoadingMore = computed(() => this.matchupsResource().loadingMore);

  readonly matchupDetailState = computed(() => this.matchupDetailResource().state);
  readonly matchupDetail = computed(() => this.matchupDetailResource().value);
  readonly matchupDetailError = computed(() => this.matchupDetailResource().error);

  readonly selectedRunState = computed(() => this.selectedRunResource().state);
  readonly selectedRun = computed(() => this.selectedRunResource().value);
  readonly selectedRunError = computed(() => this.selectedRunResource().error);

  loadTeams(): void {
    const gen = ++this.teamsRequestGen;
    this.teamsSub?.unsubscribe();
    this.teamsResource.set({ ...emptyList(), state: 'loading' });
    this.teamsSub = this.api.listOwnedTeams().subscribe({
      next: (page) => this.applyTeamsPage(gen, page, false),
      error: (err) => this.failTeams(gen, err),
    });
  }

  loadMoreTeams(): void {
    const current = this.teamsResource();
    if (!current.hasNextPage || current.loadingMore || current.state !== 'ready') {
      return;
    }
    const gen = this.teamsRequestGen;
    this.teamsResource.update((r) => ({ ...r, loadingMore: true, error: null }));
    this.teamsSub?.unsubscribe();
    this.teamsSub = this.api.listOwnedTeams(current.endCursor ?? undefined).subscribe({
      next: (page) => this.applyTeamsPage(gen, page, true),
      error: (err) => {
        if (gen !== this.teamsRequestGen) {
          return;
        }
        this.teamsResource.update((r) => ({
          ...r,
          loadingMore: false,
          error: userMessageForGraphqlError(err),
        }));
      },
    });
  }

  loadTeam(teamId: string): void {
    if (!isUuid(teamId)) {
      this.teamDetailResource.set({ state: 'not-found', value: null, error: null });
      return;
    }
    const gen = ++this.teamDetailGen;
    this.teamDetailKey = teamId;
    this.teamSub?.unsubscribe();
    this.teamDetailResource.set({ state: 'loading', value: null, error: null });
    this.teamSub = this.api.getOwnedTeam(teamId).subscribe({
      next: (team) => {
        if (gen !== this.teamDetailGen || this.teamDetailKey !== teamId) {
          return;
        }
        if (!team) {
          this.teamDetailResource.set({ state: 'not-found', value: null, error: null });
          return;
        }
        this.teamDetailResource.set({ state: 'ready', value: team, error: null });
      },
      error: (err) => {
        if (gen !== this.teamDetailGen) {
          return;
        }
        this.teamDetailResource.set({
          state: 'error',
          value: null,
          error: userMessageForGraphqlError(err),
        });
      },
    });
  }

  loadMatchups(teamId: string): void {
    if (!isUuid(teamId)) {
      this.matchupsResource.set({ ...emptyList(), state: 'not-found' });
      return;
    }
    const gen = ++this.matchupsRequestGen;
    this.matchupsTeamKey = teamId;
    this.matchupsSub?.unsubscribe();
    this.matchupsResource.set({ ...emptyList(), state: 'loading' });
    this.matchupsSub = this.api.listMatchups(teamId).subscribe({
      next: (page) => this.applyMatchupsPage(gen, teamId, page, false),
      error: (err) => this.failMatchups(gen, teamId, err),
    });
  }

  loadMoreMatchups(teamId: string): void {
    const current = this.matchupsResource();
    if (
      this.matchupsTeamKey !== teamId ||
      !current.hasNextPage ||
      current.loadingMore ||
      current.state !== 'ready'
    ) {
      return;
    }
    const gen = this.matchupsRequestGen;
    this.matchupsResource.update((r) => ({ ...r, loadingMore: true, error: null }));
    this.matchupsSub?.unsubscribe();
    this.matchupsSub = this.api
      .listMatchups(teamId, current.endCursor ?? undefined)
      .subscribe({
        next: (page) => this.applyMatchupsPage(gen, teamId, page, true),
        error: (err) => {
          if (gen !== this.matchupsRequestGen || this.matchupsTeamKey !== teamId) {
            return;
          }
          this.matchupsResource.update((r) => ({
            ...r,
            loadingMore: false,
            error: userMessageForGraphqlError(err),
          }));
        },
      });
  }

  loadMatchup(
    teamId: string,
    matchupId: string,
    options: { silent?: boolean } = {},
  ): void {
    const key = `${teamId}:${matchupId}`;
    if (!isUuid(teamId) || !isUuid(matchupId)) {
      this.matchupDetailResource.set({ state: 'not-found', value: null, error: null });
      return;
    }
    const gen = ++this.matchupDetailGen;
    this.matchupDetailKey = key;
    this.matchupSub?.unsubscribe();
    if (!options.silent) {
      this.matchupDetailResource.set({ state: 'loading', value: null, error: null });
    }
    this.matchupSub = this.api.getMatchup(teamId, matchupId).subscribe({
      next: (detail) => {
        if (gen !== this.matchupDetailGen || this.matchupDetailKey !== key) {
          return;
        }
        if (!detail) {
          this.matchupDetailResource.set({ state: 'not-found', value: null, error: null });
          return;
        }
        this.matchupDetailResource.set({ state: 'ready', value: detail, error: null });
      },
      error: (err) => {
        if (gen !== this.matchupDetailGen) {
          return;
        }
        this.matchupDetailResource.set({
          state: 'error',
          value: null,
          error: userMessageForGraphqlError(err),
        });
      },
    });
  }

  refreshMatchup(teamId: string, matchupId: string): void {
    this.loadMatchup(teamId, matchupId, { silent: true });
  }

  loadRun(teamId: string, matchupId: string, runId: string): void {
    this.fetchRun(teamId, matchupId, runId, { showLoading: true });
  }

  refreshRun(teamId: string, matchupId: string, runId: string): void {
    this.fetchRun(teamId, matchupId, runId, { showLoading: false });
  }

  private fetchRun(
    teamId: string,
    matchupId: string,
    runId: string,
    options: { showLoading: boolean },
  ): void {
    const key = `${teamId}:${matchupId}:${runId}`;
    if (!isUuid(teamId) || !isUuid(matchupId) || !isUuid(runId)) {
      this.selectedRunResource.set({ state: 'not-found', value: null, error: null });
      return;
    }
    const gen = ++this.selectedRunGen;
    this.selectedRunKey = key;
    this.selectedRunSub?.unsubscribe();
    if (options.showLoading) {
      this.selectedRunResource.set({ state: 'loading', value: null, error: null });
      this.selectedRunRevision = -1;
    }
    this.selectedRunSub = this.api.getRun(teamId, matchupId, runId).subscribe({
      next: (view) => {
        if (gen !== this.selectedRunGen || this.selectedRunKey !== key) {
          return;
        }
        const revision =
          view.kind === 'simulation' ? view.view.resultRevision : undefined;
        if (
          revision !== undefined &&
          this.selectedRunRevision >= 0 &&
          revision < this.selectedRunRevision
        ) {
          return;
        }
        if (revision !== undefined) {
          this.selectedRunRevision = revision;
        }
        this.selectedRunResource.set({ state: 'ready', value: view, error: null });
      },
      error: (err) => {
        if (gen !== this.selectedRunGen) {
          return;
        }
        if (!options.showLoading && this.selectedRunResource().state === 'ready') {
          return;
        }
        this.selectedRunResource.set({
          state: 'error',
          value: null,
          error: userMessageForGraphqlError(err),
        });
      },
    });
  }

  createOwnedTeam(
    requestId: string,
    name: string,
    imported: ImportedTeam,
  ) {
    return this.api.createOwnedTeam(requestId, name, imported);
  }

  reconcileOwnedTeam(requestId: string) {
    return this.api.getOwnedTeam(requestId);
  }

  createOpponentMatchup(
    ids: { matchupId: string; opponentId: string },
    teamId: string,
    name: string,
    imported: ImportedTeam,
  ) {
    return this.api.createOpponentMatchup(ids, teamId, name, imported);
  }

  reconcileMatchup(teamId: string, matchupId: string) {
    return this.api.getMatchup(teamId, matchupId);
  }

  prependTeam(team: Team): void {
    this.teamsResource.update((r) => ({
      ...r,
      items: [team, ...r.items.filter((t) => t.id !== team.id)],
      state: 'ready',
    }));
  }

  appendMatchup(summary: MatchupSummary): void {
    this.matchupsResource.update((r) => ({
      ...r,
      items: [summary, ...r.items.filter((m) => m.id !== summary.id)],
      state: 'ready',
    }));
  }

  private applyTeamsPage(gen: number, page: Page<Team>, append: boolean): void {
    if (gen !== this.teamsRequestGen) {
      return;
    }
    this.teamsResource.update((r) => ({
      state: 'ready',
      items: append ? dedupeById([...r.items, ...page.items]) : page.items,
      error: null,
      endCursor: page.endCursor,
      hasNextPage: page.hasNextPage,
      loadingMore: false,
    }));
  }

  private failTeams(gen: number, err: unknown): void {
    if (gen !== this.teamsRequestGen) {
      return;
    }
    this.teamsResource.set({
      ...emptyList(),
      state: 'error',
      error: userMessageForGraphqlError(err),
    });
  }

  private applyMatchupsPage(
    gen: number,
    teamId: string,
    page: Page<MatchupSummary>,
    append: boolean,
  ): void {
    if (gen !== this.matchupsRequestGen || this.matchupsTeamKey !== teamId) {
      return;
    }
    this.matchupsResource.update((r) => ({
      state: 'ready',
      items: append ? dedupeById([...r.items, ...page.items]) : page.items,
      error: null,
      endCursor: page.endCursor,
      hasNextPage: page.hasNextPage,
      loadingMore: false,
    }));
  }

  private failMatchups(gen: number, teamId: string, err: unknown): void {
    if (gen !== this.matchupsRequestGen || this.matchupsTeamKey !== teamId) {
      return;
    }
    this.matchupsResource.set({
      ...emptyList(),
      state: 'error',
      error: userMessageForGraphqlError(err),
    });
  }

  /** Test helper */
  invalidateAll(): void {
    this.teamsRequestGen++;
    this.teamDetailGen++;
    this.matchupsRequestGen++;
    this.matchupDetailGen++;
    this.selectedRunGen++;
    this.teamsSub?.unsubscribe();
    this.teamSub?.unsubscribe();
    this.matchupsSub?.unsubscribe();
    this.matchupSub?.unsubscribe();
    this.selectedRunSub?.unsubscribe();
    this.teamsResource.set(emptyList());
    this.teamDetailResource.set(emptyDetail());
    this.matchupsResource.set(emptyList());
    this.matchupDetailResource.set(emptyDetail());
    this.selectedRunResource.set(emptyDetail());
    this.selectedRunRevision = -1;
  }

  resetForTests(): void {
    this.invalidateAll();
  }
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    out.push(item);
  }
  return out;
}
