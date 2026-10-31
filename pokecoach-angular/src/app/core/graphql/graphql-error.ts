export type GraphqlErrorKind = 'network' | 'graphql' | 'format' | 'timeout';

export class GraphqlClientError extends Error {
  readonly kind: GraphqlErrorKind;

  constructor(
    kind: GraphqlErrorKind,
    message: string,
    readonly details?: readonly string[],
  ) {
    super(message);
    this.name = 'GraphqlClientError';
    this.kind = kind;
  }
}

export function userMessageForGraphqlError(err: unknown): string {
  if (err instanceof GraphqlClientError) {
    return err.message;
  }
  return 'Une erreur inattendue est survenue. Réessayez dans un instant.';
}
