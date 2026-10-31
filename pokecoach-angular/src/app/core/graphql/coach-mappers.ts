import type { MatchupReport } from '../models/matchup.model';
import type { PokemonSet, PokemonSlot, Team, TeamSource } from '../models/team.model';
import { pokemonTuple } from '../models/team.model';
import type { GqlRunNode, GqlTeamNode } from './coach-dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RunStatus =
  | 'queued'
  | 'running'
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

export interface MatchupSummary {
  id: string;
  teamId: string;
  opponent: Team;
  createdAt: string;
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
  latestRun: RunSummary | null;
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
  const successfulResult = mapSuccessfulRun(node.latestSuccessfulRun);
  return {
    id: node.id,
    teamId: node.ourTeamId,
    ourTeam,
    opponentTeam,
    createdAt: normalizeIso(node.createdAt),
    latestRun,
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
    pokemon: imported.pokemon.map((p) => ({
      slot: p.slot,
      species: p.species,
      nickname: p.nickname ?? null,
      gender: p.gender ?? null,
      item: p.item ?? null,
      ability: p.ability ?? null,
      level: p.level ?? null,
      teraType: p.teraType ?? null,
      nature: p.nature ?? null,
      evs: p.evs ?? null,
      ivs: p.ivs ?? null,
      moves: [...p.moves],
      rawBlock: p.rawBlock,
    })),
  };
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
  return null;
}

export function activeRunStatusMessage(run: RunSummary | null): string | null {
  if (!run) {
    return null;
  }
  if (run.status === 'cancelled') {
    return 'Analyse annulée';
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
  if (run.status === 'cancelled' || run.status === 'failed' || run.status === 'succeeded') {
    return false;
  }
  return run.status === 'queued' || run.status === 'running';
}
