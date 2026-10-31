import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { sanitizeShowdownSpeciesForPokeApi } from './pokemon-aliases';

export interface PokemonImage {
  url: string;
  alt: string;
  isFallback: boolean;
}

interface CacheEntry {
  observable: Observable<PokemonImage>;
}

@Injectable({ providedIn: 'root' })
export class PokemonImages {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly placeholderUrl = '/images/pokemon-placeholder.svg';

  getImage(species: string): Observable<PokemonImage> {
    const key = species.trim();
    const existing = this.cache.get(key);
    if (existing) {
      return existing.observable;
    }

    const apiId = sanitizeShowdownSpeciesForPokeApi(key);
    const request$ = this.http
      .get<PokeApiPokemon>(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(apiId)}`)
      .pipe(
        map((data) => toPokemonImage(key, data)),
        catchError(() =>
          of({
            url: this.placeholderUrl,
            alt: key,
            isFallback: true,
          } satisfies PokemonImage),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.cache.set(key, { observable: request$ });
    return request$;
  }

  /** Allows retry after transient failure by dropping cached error responses. */
  clearCacheEntry(species: string): void {
    this.cache.delete(species.trim());
  }

  placeholder(): PokemonImage {
    return {
      url: this.placeholderUrl,
      alt: '',
      isFallback: true,
    };
  }
}

interface PokeApiPokemon {
  name: string;
  sprites: {
    other?: {
      'official-artwork'?: { front_default?: string | null };
    };
    front_default?: string | null;
  };
}

function toPokemonImage(species: string, data: PokeApiPokemon): PokemonImage {
  const artwork =
    data.sprites.other?.['official-artwork']?.front_default ??
    data.sprites.front_default;
  if (!artwork) {
    return {
      url: '/images/pokemon-placeholder.svg',
      alt: species,
      isFallback: true,
    };
  }
  return {
    url: artwork,
    alt: species,
    isFallback: false,
  };
}
