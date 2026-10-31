import type { MatchupReport } from '../models/matchup.model';
import type { RunProgressJson, SimulationResultV2 } from '../models/simulation-result.model';
import type { PokemonSet, PokemonSlot, Team, TeamSource } from '../models/team.model';
import { pokemonTuple } from '../models/team.model';
import { mapSimulationV2ToTabDisplay, type SimulationTabDisplay } from '../matchup/simulation-v2-display';
import { validateSimulationResult } from './simulation-result-validator';
import type { GqlRunDetailNode, GqlRunNode, GqlTeamNode } from './coach-dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RunStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type RunProcessStatus =
  | 'INITIAL'
  | 'PENDING_STATS'
  | 'PENDING_GAME_SIMULATIONS'
  | 'SUCCESS'
  | 'ERROR';

export interface RunSummary {
  id: string;
  status: RunStatus;
  processStatus: RunProcessStatus;
  source: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface RunResult {
  summary: RunSummary;
  reportVersion: number;
  report: MatchupReport;
  ourTeamSnapshot: Team;
  opponentTeamSnapshot: Team;
}

export interface RunProgress {
  phase: string;
  completed: number;
  total: number;
}

export interface SimulationRunView {
  summary: RunSummary;
  reportVersion: 2;
  partialResult: SimulationResultV2;
  resultRevision: number;
  progress: RunProgress | null;
  targetPhase: string | null;
  executionMetadata: unknown;
  ourTeamSnapshot: Team;
  opponentTeamSnapshot: Team;
  tabDisplay: SimulationTabDisplay;
}

export type SelectedRunView =
  | { kind: 'absent' }
  | { kind: 'mock'; result: RunResult }
  | { kind: 'simulation'; view: SimulationRunView }
  | { kind: 'incompatible'; message: string; summary: RunSummary | null };

export interface MatchupSummary {
  id: string;
  teamId: string;
  opponent: Team;
  createdAt: string;
  regulation: string | null;
  latestRun: RunSummary | null;
  hasSuccessfulReport: boolean;
}

export type SuccessfulResultState =
  | { kind: 'absent' }
  | { kind: 'valid'; result: RunResult }
  | { kind: 'incompatible'; message: string };

export interface MatchupDetail {
  id: string;
  teamId: string;
  ourTeam: Team;
  opponentTeam: Team;
  createdAt: string;
  regulation: string | null;
  latestRun: RunSummary | null;
  runs: RunSummary[];
  successfulResult: SuccessfulResultState;
}

export interface Page<T> {
  items: T[];
  endCursor: string | null;
  hasNextPage: boolean;
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function mapRunStatus(raw: string): RunStatus | null {
  switch (raw) {
    case 'queued':
    case 'running':
    case 'paused':
    case 'succeeded':
    case 'failed':
    case 'cancelled':
      return raw;
    default:
      return null;
  }
}

export function mapProcessStatus(raw: string): RunProcessStatus | null {
  switch (raw) {
    case 'INITIAL':
    case 'PENDING_STATS':
    case 'PENDING_GAME_SIMULATIONS':
    case 'SUCCESS':
    case 'ERROR':
      return raw;
    default:
      return null;
  }
}

export function mapRunSummary(node: GqlRunNode | null | undefined): RunSummary | null {
  if (!node || !isUuid(node.id)) {
    return null;
  }
  const status = mapRunStatus(node.status);
  const processStatus = mapProcessStatus(node.processStatus);
  if (!status || !processStatus) {
    return null;
  }
  return {
    id: node.id,
    status,
    processStatus,
    source: node.source,
    createdAt: node.createdAt,
    finishedAt: node.finishedAt,
  };
}

export function mapTeamNode(
  node: GqlTeamNode | null | undefined,
  expectedKind?: 'owned' | 'opponent',
): Team | null {
  if (!node || !isUuid(node.id) || node.isDeleted) {
    return null;
  }
  if (expectedKind && node.kind !== expectedKind) {
    return null;
  }
  if (node.sourceKind !== 'url' && node.sourceKind !== 'text') {
    return null;
  }
  const pokemon = mapPokemonJson(node.pokemon);
  if (!pokemon) {
    return null;
  }
  const source: TeamSource = {
    kind: node.sourceKind,
    rawText: node.sourceText ?? '',
    ...(node.sourceUrl ? { url: node.sourceUrl } : {}),
  };
  return {
    id: node.id,
    name: node.name,
    source,
    pokemon,
    createdAt: normalizeIso(node.createdAt),
  };
}

export function mapTeamSnapshotJson(raw: unknown): Team | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const id = obj['id'];
  const name = obj['name'];
  const sourceRaw = obj['source'];
  const pokemonRaw = obj['pokemon'];
  const createdAt = obj['createdAt'];
  if (typeof id !== 'string' || !isUuid(id) || typeof name !== 'string') {
    return null;
  }
  const source = mapTeamSourceJson(sourceRaw);
  if (!source) {
    return null;
  }
  const pokemon = mapPokemonJson(pokemonRaw);
  if (!pokemon || typeof createdAt !== 'string') {
    return null;
  }
  return {
    id,
    name,
    source,
    pokemon,
    createdAt: normalizeIso(createdAt),
  };
}

function mapTeamSourceJson(raw: unknown): TeamSource | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const kind = obj['kind'];
  const rawText = obj['rawText'];
  if (kind !== 'url' && kind !== 'text') {
    return null;
  }
  if (typeof rawText !== 'string') {
    return null;
  }
  const url = obj['url'];
  return {
    kind,
    rawText,
    ...(typeof url === 'string' ? { url } : {}),
  };
}

export function mapPokemonJson(raw: unknown): Team['pokemon'] | null {
  if (!Array.isArray(raw) || raw.length !== 6) {
    return null;
  }
  const sets: PokemonSet[] = [];
  for (let i = 0; i < 6; i++) {
    const entry = raw[i];
    if (typeof entry !== 'object' || entry === null) {
      return null;
    }
    const obj = entry as Record<string, unknown>;
    const slot = obj['slot'];
    const species = obj['species'];
    const moves = obj['moves'];
    const rawBlock = obj['rawBlock'];
    if (slot !== i || typeof species !== 'string' || !Array.isArray(moves)) {
      return null;
    }
    if (typeof rawBlock !== 'string') {
      return null;
    }
    const moveNames = moves.filter((m): m is string => typeof m === 'string');
    if (moveNames.length !== moves.length) {
      return null;
    }
    sets.push({
      slot: i as PokemonSlot,
      species,
      moves: moveNames,
      rawBlock,
      ...(typeof obj['nickname'] === 'string' ? { nickname: obj['nickname'] } : {}),
      ...(obj['gender'] === 'M' || obj['gender'] === 'F'
        ? { gender: obj['gender'] }
        : {}),
      ...(typeof obj['item'] === 'string' ? { item: obj['item'] } : {}),
      ...(typeof obj['ability'] === 'string' ? { ability: obj['ability'] } : {}),
      ...(typeof obj['level'] === 'number' ? { level: obj['level'] } : {}),
      ...(typeof obj['teraType'] === 'string' ? { teraType: obj['teraType'] } : {}),
      ...(typeof obj['nature'] === 'string' ? { nature: obj['nature'] } : {}),
      ...(typeof obj['evs'] === 'object' && obj['evs'] !== null
        ? { evs: obj['evs'] as Record<string, number> }
        : {}),
      ...(typeof obj['ivs'] === 'object' && obj['ivs'] !== null
        ? { ivs: obj['ivs'] as Record<string, number> }
        : {}),
    });
  }
  try {
    return pokemonTuple(sets);
  } catch {
    return null;
  }
}

export function mapMatchupSummary(
  node: import('./coach-dto').GqlMatchupNode,
): MatchupSummary | null {
  if (!isUuid(node.id) || !isUuid(node.ourTeamId)) {
    return null;
  }
  const opponent = mapTeamNode(node.opponentTeam, 'opponent');
  if (!opponent) {
    return null;
  }
  const latestRun = mapRunSummary(node.matchupRuns?.nodes?.[0] ?? null);
  return {
    id: node.id,
    teamId: node.ourTeamId,
    opponent,
    createdAt: normalizeIso(node.createdAt),
    regulation: node.regulation ?? null,
    latestRun,
    hasSuccessfulReport: Boolean(node.latestSuccessfulRun?.id),
  };
}

export function mapMatchupDetail(
  node: import('./coach-dto').GqlMatchupNode,
  expectedTeamId: string,
): MatchupDetail | null {
  if (!isUuid(node.id) || node.ourTeamId !== expectedTeamId) {
    return null;
  }
  const ourTeam = mapTeamNode(node.ourTeam, 'owned');
  const opponentTeam = mapTeamNode(node.opponentTeam, 'opponent');
  if (!ourTeam || !opponentTeam) {
    return null;
  }
  const latestRun = mapRunSummary(node.matchupRuns?.nodes?.[0] ?? null);
  const runs =
    node.matchupRuns?.nodes
      ?.map((n) => mapRunSummary(n))
      .filter((r): r is RunSummary => r !== null) ?? [];
  const successfulResult = mapSuccessfulRun(node.latestSuccessfulRun);
  return {
    id: node.id,
    teamId: node.ourTeamId,
    ourTeam,
    opponentTeam,
    createdAt: normalizeIso(node.createdAt),
    regulation: node.regulation ?? null,
    latestRun,
    runs,
    successfulResult,
  };
}

function mapSuccessfulRun(run: GqlRunNode | null | undefined): SuccessfulResultState {
  if (!run) {
    return { kind: 'absent' };
  }
  const summary = mapRunSummary(run);
  if (!summary || summary.status !== 'succeeded') {
    return { kind: 'incompatible', message: 'Rapport enregistré illisible.' };
  }
  if (run.reportVersion !== 1 || run.source !== 'mock') {
    return {
      kind: 'incompatible',
      message: 'Format de rapport non pris en charge pour le moment.',
    };
  }
  const report = validateMockReportV1(run.report);
  if (!report) {
    return { kind: 'incompatible', message: 'Rapport enregistré illisible.' };
  }
  const ourTeamSnapshot = mapTeamSnapshotJson(run.ourTeamSnapshot);
  const opponentTeamSnapshot = mapTeamSnapshotJson(run.opponentTeamSnapshot);
  if (!ourTeamSnapshot || !opponentTeamSnapshot) {
    return { kind: 'incompatible', message: 'Instantanés d’équipe illisibles.' };
  }
  return {
    kind: 'valid',
    result: {
      summary,
      reportVersion: run.reportVersion,
      report,
      ourTeamSnapshot,
      opponentTeamSnapshot,
    },
  };
}

function normalizeIso(value: string): string {
  return value;
}

export function teamInputFromImported(
  id: string,
  kind: 'owned' | 'opponent',
  name: string,
  imported: import('../models/team.model').ImportedTeam,
): Record<string, unknown> {
  return {
    id,
    kind,
    name: name.trim(),
    sourceKind: imported.source.kind,
    sourceUrl: imported.source.url ?? null,
    sourceText: imported.source.rawText,
    pokemon: imported.pokemon.map((p) => pokemonSetToDbJson(p)),
  };
}

/** Omit null optionals — PostgreSQL `is_valid_pokemon_slot_entry` rejects explicit JSON nulls. */
export function pokemonSetToDbJson(
  p: import('../models/team.model').PokemonSet,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    slot: p.slot,
    species: p.species,
    moves: [...p.moves],
    rawBlock: p.rawBlock,
  };
  if (p.nickname !== undefined && p.nickname !== '') {
    out['nickname'] = p.nickname;
  }
  if (p.gender !== undefined) {
    out['gender'] = p.gender;
  }
  if (p.item !== undefined && p.item !== '') {
    out['item'] = p.item;
  }
  if (p.ability !== undefined && p.ability !== '') {
    out['ability'] = p.ability;
  }
  if (p.level !== undefined) {
    out['level'] = p.level;
  }
  if (p.teraType !== undefined && p.teraType !== '') {
    out['teraType'] = p.teraType;
  }
  if (p.nature !== undefined && p.nature !== '') {
    out['nature'] = p.nature;
  }
  if (p.evs !== undefined) {
    out['evs'] = p.evs;
  }
  if (p.ivs !== undefined) {
    out['ivs'] = p.ivs;
  }
  return out;
}

function validateMockReportV1(raw: unknown): MatchupReport | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (obj['source'] !== 'mock' || obj['fixtureVersion'] !== 1) {
    return null;
  }
  for (const key of [
    'phaseASampleSize',
    'phaseBSampleSize',
    'phaseCSampleSize',
    'phaseDSampleSize',
  ]) {
    if (typeof obj[key] !== 'number') {
      return null;
    }
  }
  if (!Array.isArray(obj['opponentLeads'])) {
    return null;
  }
  if (!Array.isArray(obj['selectionComparisons'])) {
    return null;
  }
  const leadRec = obj['leadRecommendation'];
  const gameplan = obj['gameplan'];
  if (typeof leadRec !== 'object' || leadRec === null) {
    return null;
  }
  if (typeof gameplan !== 'object' || gameplan === null) {
    return null;
  }
  return raw as MatchupReport;
}

export function reportProvenanceLabel(source: string | null): string | null {
  if (source === 'mock') {
    return 'Rapport de démonstration enregistré';
  }
  if (source === 'simulation') {
    return 'Rapport issu de simulation';
  }
  return null;
}

export function mapRunProgress(raw: unknown): RunProgress | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as RunProgressJson;
  if (
    typeof obj.phase !== 'string' ||
    typeof obj.completed !== 'number' ||
    typeof obj.total !== 'number' ||
    obj.completed < 0 ||
    obj.total < 0 ||
    obj.completed > obj.total
  ) {
    return null;
  }
  return { phase: obj.phase, completed: obj.completed, total: obj.total };
}

export function mapSimulationRunView(
  node: GqlRunDetailNode | null | undefined,
  expectedMatchupId: string,
): SelectedRunView {
  if (!node) {
    return { kind: 'absent' };
  }
  if (!isUuid(node.matchupId) || node.matchupId !== expectedMatchupId) {
    return {
      kind: 'incompatible',
      message: 'Ce run n’appartient pas à ce matchup.',
      summary: mapRunSummary(node),
    };
  }
  const summary = mapRunSummary(node);
  if (!summary) {
    return { kind: 'incompatible', message: 'Run illisible.', summary: null };
  }

  if (node.source === 'mock' && node.reportVersion === 1 && summary.status === 'succeeded') {
    const report = validateMockReportV1(node.report);
    const ourTeamSnapshot = mapTeamSnapshotJson(node.ourTeamSnapshot);
    const opponentTeamSnapshot = mapTeamSnapshotJson(node.opponentTeamSnapshot);
    if (!report || !ourTeamSnapshot || !opponentTeamSnapshot) {
      return { kind: 'incompatible', message: 'Rapport enregistré illisible.', summary };
    }
    return {
      kind: 'mock',
      result: {
        summary,
        reportVersion: node.reportVersion,
        report,
        ourTeamSnapshot,
        opponentTeamSnapshot,
      },
    };
  }

  if (node.source === 'simulation' && node.reportVersion === 2) {
    const validated = validateSimulationResult(node.partialResult ?? node.report);
    const ourTeamSnapshot = mapTeamSnapshotJson(node.ourTeamSnapshot);
    const opponentTeamSnapshot = mapTeamSnapshotJson(node.opponentTeamSnapshot);
    if (!validated.ok || !ourTeamSnapshot || !opponentTeamSnapshot) {
      return {
        kind: 'incompatible',
        message: 'Format de rapport non pris en charge pour le moment.',
        summary,
      };
    }
    const revision =
      typeof node.resultRevision === 'number' && node.resultRevision >= 0
        ? node.resultRevision
        : 0;
    return {
      kind: 'simulation',
      view: {
        summary,
        reportVersion: 2,
        partialResult: validated.value,
        resultRevision: revision,
        progress: mapRunProgress(node.progress),
        targetPhase: node.targetPhase ?? null,
        executionMetadata: node.executionMetadata ?? {},
        ourTeamSnapshot,
        opponentTeamSnapshot,
        tabDisplay: mapSimulationV2ToTabDisplay(validated.value),
      },
    };
  }

  return {
    kind: 'incompatible',
    message: 'Format de rapport non pris en charge pour le moment.',
    summary,
  };
}

export function activeRunStatusMessage(run: RunSummary | null): string | null {
  if (!run) {
    return null;
  }
  if (run.status === 'cancelled') {
    return 'Analyse annulée';
  }
  if (run.status === 'paused') {
    return 'Analyse en pause — résultats partiels consultables';
  }
  if (run.status === 'failed' || run.processStatus === 'ERROR') {
    return 'La dernière analyse a échoué.';
  }
  if (run.status === 'queued' || run.processStatus === 'INITIAL') {
    return 'Analyse en attente';
  }
  if (run.status === 'running' && run.processStatus === 'PENDING_STATS') {
    return 'Calcul des statistiques';
  }
  if (
    run.status === 'running' &&
    run.processStatus === 'PENDING_GAME_SIMULATIONS'
  ) {
    return 'Simulations des parties en cours';
  }
  if (run.status === 'running') {
    return 'Analyse en cours';
  }
  return null;
}

export function shouldPollRun(run: RunSummary | null): boolean {
  if (!run) {
    return false;
  }
  return run.status === 'queued' || run.status === 'running';
}
