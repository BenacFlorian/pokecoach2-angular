/** Contrat HTTP aligné sur la spec workflow §2 (réponses camelCase). */

export const ANALYSIS_PHASE_ORDER = ['A', 'C', 'B', 'D', 'synthesis'] as const;

export type AnalysisPhase = (typeof ANALYSIS_PHASE_ORDER)[number];
export type AnalysisProfile = 'standard' | 'smoke';

export interface AnalysisCapabilitiesResponse {
  phases: string[];
  phaseOrder?: string[];
  profiles: string[];
  regulations: string[];
}

export interface AnalysisCapabilitiesView {
  phases: string[];
  phaseOrder: string[];
  profiles: AnalysisProfile[];
  regulations: string[];
  defaultTargetPhase: string;
}

export interface AnalysisStartRequest {
  targetPhase: string;
  profile: AnalysisProfile;
}

export interface AnalysisContinueRequest {
  targetPhase: string;
}

export interface AnalysisStartResponse {
  matchupId: string;
  runId: string;
  source: string;
  status: string;
  processStatus: string;
}

export interface AnalysisStartResult extends AnalysisStartResponse {
  httpStatus: 200 | 202;
}

export function highestDeployedPhase(
  phases: readonly string[],
  phaseOrder: readonly string[] = ANALYSIS_PHASE_ORDER,
): string {
  if (phases.length === 0) {
    throw new Error('Aucune phase disponible.');
  }
  let best = phases[0];
  let bestIndex = phaseOrder.indexOf(best as AnalysisPhase);
  if (bestIndex < 0) {
    bestIndex = -1;
  }
  for (const phase of phases) {
    const idx = phaseOrder.indexOf(phase as AnalysisPhase);
    if (idx >= 0 && idx > bestIndex) {
      best = phase;
      bestIndex = idx;
    }
  }
  return best;
}

export function mapCapabilitiesView(
  body: AnalysisCapabilitiesResponse,
): AnalysisCapabilitiesView {
  const profiles = body.profiles.filter(
    (p): p is AnalysisProfile => p === 'standard' || p === 'smoke',
  );
  const phaseOrder =
    body.phaseOrder?.length &&
    body.phaseOrder.every((p) => ANALYSIS_PHASE_ORDER.includes(p as AnalysisPhase))
      ? [...body.phaseOrder]
      : [...ANALYSIS_PHASE_ORDER];
  const phases = [...body.phases];
  const defaultTargetPhase = phases.includes('synthesis')
    ? 'synthesis'
    : highestDeployedPhase(phases, phaseOrder);
  return {
    phases,
    phaseOrder,
    profiles,
    regulations: [...body.regulations],
    defaultTargetPhase,
  };
}

export function phaseProgressLabel(phase: string): string {
  switch (phase) {
    case 'A':
      return 'Observation des leads adverses';
    case 'C':
      return 'Sélection de notre équipe';
    case 'B':
      return 'Étude des ouvertures face à notre sélection';
    case 'D':
      return 'Affinage ciblé';
    default:
      return phase;
  }
}
