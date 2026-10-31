/** Contrat HTTP aligné sur la spec workflow §2 (réponses camelCase). */

export const ANALYSIS_PHASE_ORDER = ['A', 'B', 'C', 'D', 'synthesis'] as const;

export type AnalysisPhase = (typeof ANALYSIS_PHASE_ORDER)[number];
export type AnalysisProfile = 'standard' | 'smoke';

export interface AnalysisCapabilitiesResponse {
  phases: string[];
  profiles: string[];
  regulations: string[];
}

export interface AnalysisCapabilitiesView {
  phases: string[];
  profiles: AnalysisProfile[];
  regulations: string[];
  defaultTargetPhase: string;
}

export interface AnalysisStartRequest {
  targetPhase: string;
  profile: AnalysisProfile;
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

export function highestDeployedPhase(phases: readonly string[]): string {
  if (phases.length === 0) {
    throw new Error('Aucune phase disponible.');
  }
  let best = phases[0];
  let bestIndex = ANALYSIS_PHASE_ORDER.indexOf(best as AnalysisPhase);
  if (bestIndex < 0) {
    bestIndex = -1;
  }
  for (const phase of phases) {
    const idx = ANALYSIS_PHASE_ORDER.indexOf(phase as AnalysisPhase);
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
  return {
    phases: [...body.phases],
    profiles,
    regulations: [...body.regulations],
    defaultTargetPhase: highestDeployedPhase(body.phases),
  };
}
