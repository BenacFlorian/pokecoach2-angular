import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, InjectionToken, Injectable } from '@angular/core';
import { Observable, timeout, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GraphqlClientError } from './graphql-error';

export const GRAPHQL_ENDPOINT = new InjectionToken<string>('GRAPHQL_ENDPOINT', {
  providedIn: 'root',
  factory: () => '/graphql',
});

export const GRAPHQL_TIMEOUT_MS = new InjectionToken<number>('GRAPHQL_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => 30_000,
});

interface GraphqlEnvelope<T> {
  data?: T;
  errors?: { message: string }[];
}

@Injectable({ providedIn: 'root' })
export class GraphqlClient {
  private readonly http = inject(HttpClient);
  private readonly endpoint = inject(GRAPHQL_ENDPOINT);
  private readonly timeoutMs = inject(GRAPHQL_TIMEOUT_MS);

  execute<T>(
    operationName: string,
    query: string,
    variables: Record<string, unknown> = {},
  ): Observable<T> {
    return this.http
      .post<GraphqlEnvelope<T>>(
        this.endpoint,
        { operationName, query, variables },
        { responseType: 'json' },
      )
      .pipe(
        timeout({
          each: this.timeoutMs,
          with: () =>
            throwError(
              () =>
                new GraphqlClientError(
                  'timeout',
                  'Le serveur met trop de temps à répondre. Réessayez.',
                ),
            ),
        }),
        map((body) => this.parseEnvelope(body as GraphqlEnvelope<T>)),
        catchError((err: unknown) => throwError(() => this.normalizeHttpError(err))),
      );
  }

  private parseEnvelope<T>(body: GraphqlEnvelope<T>): T {
    if (typeof body !== 'object' || body === null) {
      throw new GraphqlClientError(
        'format',
        'Réponse GraphQL illisible. Vérifiez le proxy ou réessayez.',
      );
    }
    const envelope = body;
    if (envelope.errors?.length) {
      const messages = envelope.errors.map((e) => e.message);
      throw new GraphqlClientError(
        'graphql',
        messages[0] ?? 'La requête GraphQL a échoué.',
        messages,
      );
    }
    if (envelope.data === undefined || envelope.data === null) {
      throw new GraphqlClientError(
        'graphql',
        'Aucune donnée reçue du serveur.',
      );
    }
    return envelope.data;
  }

  private normalizeHttpError(err: unknown): GraphqlClientError {
    if (err instanceof GraphqlClientError) {
      return err;
    }
    if (err instanceof HttpErrorResponse) {
      const contentType = err.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) {
        return new GraphqlClientError(
          'format',
          'Le proxy renvoie une page HTML au lieu de GraphQL.',
        );
      }
      return new GraphqlClientError(
        'network',
        'Impossible de joindre l’API. Vérifiez que PostGraphile est démarré.',
      );
    }
    return new GraphqlClientError(
      'network',
      'Impossible de joindre l’API. Vérifiez que PostGraphile est démarré.',
    );
  }
}
