import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const POKEPASTE_HOST = 'pokepast.es';
const FETCH_TIMEOUT_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class PokepasteClient {
  private readonly http = inject(HttpClient);

  fetchText(url: string): Observable<string> {
    const normalized = normalizePokepasteUrl(url);
    if (!normalized) {
      return throwError(
        () =>
          new PokepasteClientError(
            'invalid-url',
            'Seules les URL pokepast.es sont acceptées.',
          ),
      );
    }

    return this.http.get(normalized, { responseType: 'text' }).pipe(
      timeout(FETCH_TIMEOUT_MS),
      map((body) => body.trim()),
      catchError((err: unknown) => throwError(() => toClientError(err))),
    );
  }
}

export type PokepasteClientErrorKind =
  | 'invalid-url'
  | 'not-found'
  | 'network'
  | 'unknown';

export class PokepasteClientError extends Error {
  constructor(
    readonly kind: PokepasteClientErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'PokepasteClientError';
  }
}

export function normalizePokepasteUrl(input: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }
  if (parsed.hostname !== POKEPASTE_HOST && parsed.hostname !== `www.${POKEPASTE_HOST}`) {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const last = segments[segments.length - 1];
  if (last === 'raw' || last === 'json') {
    parsed.pathname = `/${segments.slice(0, -1).join('/')}/raw`;
  } else {
    parsed.pathname = `/${segments.join('/')}/raw`;
  }
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function toClientError(err: unknown): PokepasteClientError {
  if (err instanceof PokepasteClientError) {
    return err;
  }
  if (err instanceof HttpErrorResponse) {
    if (err.status === 404) {
      return new PokepasteClientError(
        'not-found',
        'Ce Poképaste est introuvable. Vérifiez le lien ou collez le texte Showdown.',
      );
    }
    return new PokepasteClientError(
      'network',
      'Impossible de récupérer le Poképaste. Vérifiez votre connexion ou collez le texte.',
    );
  }
  if (err instanceof Error && err.name === 'TimeoutError') {
    return new PokepasteClientError(
      'network',
      'Le Poképaste met trop de temps à répondre. Réessayez ou collez le texte.',
    );
  }
  return new PokepasteClientError(
    'unknown',
    'Impossible de récupérer le Poképaste pour le moment.',
  );
}
