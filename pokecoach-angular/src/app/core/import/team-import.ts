import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import type { ImportedTeam, TeamInput } from '../models/team.model';
import { PokepasteParser } from './pokepaste-parser';
import { PokepasteClient, PokepasteClientError } from './pokepaste-client';

export type TeamImportErrorKind =
  | 'empty'
  | 'parse'
  | 'fetch'
  | 'invalid-url';

export class TeamImportError extends Error {
  constructor(
    readonly kind: TeamImportErrorKind,
    message: string,
    readonly details?: readonly string[],
  ) {
    super(message);
    this.name = 'TeamImportError';
  }
}

@Injectable({ providedIn: 'root' })
export class TeamImport {
  private readonly parser = new PokepasteParser();
  private readonly client = inject(PokepasteClient);

  resolve(input: TeamInput): Observable<ImportedTeam> {
    if (input.kind === 'text') {
      try {
        return of(this.parseText(input.value.trim()));
      } catch (err) {
        return throwError(() => err);
      }
    }

    const url = input.value.trim();
    if (!url) {
      return throwError(
        () =>
          new TeamImportError(
            'empty',
            'Indiquez une URL Poképaste ou collez le texte Showdown.',
          ),
      );
    }

    return this.client.fetchText(url).pipe(
      map((rawText) => this.parseFetched(rawText, url, 'url')),
      catchError((err: unknown) => {
        if (err instanceof TeamImportError) {
          return throwError(() => err);
        }
        if (err instanceof PokepasteClientError) {
          return throwError(
            () => new TeamImportError('fetch', err.message),
          );
        }
        return throwError(
          () =>
            new TeamImportError(
              'fetch',
              'Impossible d’importer l’équipe pour le moment.',
            ),
        );
      }),
    );
  }

  private parseText(rawText: string): ImportedTeam {
    if (!rawText) {
      throw new TeamImportError(
        'empty',
        'Collez le texte Showdown de l’équipe (six Pokémon).',
      );
    }
    return this.parseFetched(rawText, undefined, 'text');
  }

  private parseFetched(
    rawText: string,
    url: string | undefined,
    kind: 'url' | 'text',
  ): ImportedTeam {
    const result = this.parser.parse(rawText);
    if (result.kind === 'error') {
      throw new TeamImportError(
        'parse',
        'Le paste Showdown n’a pas pu être lu.',
        result.messages,
      );
    }
    return {
      source: { kind, rawText, url },
      pokemon: result.pokemon,
      warnings: result.warnings,
    };
  }
}
