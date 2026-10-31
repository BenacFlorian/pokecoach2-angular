import { HttpErrorResponse } from '@angular/common/http';

export type AnalysisErrorKind =
  | 'capabilities'
  | 'start'
  | 'continue'
  | 'cancel'
  | 'conflict'
  | 'validation'
  | 'unavailable'
  | 'network'
  | 'response';

export type AnalysisHttpContext = 'capabilities' | 'start' | 'continue' | 'cancel';

export class AnalysisError extends Error {
  readonly kind: AnalysisErrorKind;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(
    kind: AnalysisErrorKind,
    message: string,
    options?: { status?: number | null; retryable?: boolean },
  ) {
    super(message);
    this.name = 'AnalysisError';
    this.kind = kind;
    this.status = options?.status ?? null;
    this.retryable = options?.retryable ?? false;
  }
}

export interface AnalysisErrorBody {
  detail?: { code?: string; message?: string };
}

export function analysisErrorMessage(err: unknown): string {
  if (err instanceof AnalysisError) {
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Le lancement de l’analyse a échoué.';
}

function defaultFailureMessage(context: AnalysisHttpContext): string {
  switch (context) {
    case 'capabilities':
      return 'Impossible de charger les capacités d’analyse.';
    case 'continue':
      return 'La continuation de l’analyse a échoué.';
    case 'cancel':
      return 'L’annulation de l’analyse a échoué.';
    default:
      return 'Le lancement de l’analyse a échoué.';
  }
}

export function mapHttpAnalysisError(
  err: unknown,
  context: AnalysisHttpContext,
): AnalysisError {
  if (!(err instanceof HttpErrorResponse)) {
    return new AnalysisError('network', 'Service d’analyse indisponible.', {
      retryable: true,
    });
  }
  const status = err.status;
  const body = err.error as AnalysisErrorBody | null;
  const detailMessage = body?.detail?.message;
  const code = body?.detail?.code;

  if (status === 0) {
    return new AnalysisError('network', 'Service d’analyse indisponible.', {
      status,
      retryable: true,
    });
  }
  if (status === 503) {
    return new AnalysisError(
      'unavailable',
      detailMessage ?? 'Service d’analyse temporairement indisponible.',
      { status, retryable: true },
    );
  }
  if (status === 409) {
    const retryable = context === 'start' || context === 'continue';
    return new AnalysisError(
      'conflict',
      detailMessage ??
        (context === 'start'
          ? 'Une analyse est déjà en cours ou la commande entre en conflit.'
          : 'Conflit avec une commande existante.'),
      { status, retryable },
    );
  }
  if (status === 422) {
    return new AnalysisError(
      'validation',
      detailMessage ?? 'Format ou cible d’analyse invalide.',
      { status, retryable: false },
    );
  }
  if (status === 404) {
    const kind: AnalysisErrorKind =
      context === 'capabilities' ? 'capabilities' : context;
    return new AnalysisError(
      kind,
      context === 'capabilities'
        ? 'Service d’analyse introuvable. Vérifiez que l’API Python tourne (port 8042).'
        : detailMessage ?? 'Ressource introuvable.',
      { status, retryable: context === 'capabilities' },
    );
  }
  if (detailMessage) {
    return new AnalysisError(context, detailMessage, {
      status,
      retryable: status >= 500,
    });
  }
  if (code) {
    return new AnalysisError(context, `Erreur d’analyse (${code}).`, {
      status,
      retryable: status >= 500,
    });
  }
  return new AnalysisError(context, defaultFailureMessage(context), {
    status,
    retryable: status >= 500,
  });
}
