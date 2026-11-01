import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ItemImage {
  url: string;
  alt: string;
}

interface CacheEntry {
  observable: Observable<ItemImage | null>;
}

@Injectable({ providedIn: 'root' })
export class PokemonItemImages {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, CacheEntry>();

  getImage(itemName: string | null | undefined): Observable<ItemImage | null> {
    const key = normalizeItemId(itemName);
    if (!key) {
      return of(null);
    }
    const existing = this.cache.get(key);
    if (existing) {
      return existing.observable;
    }
    const request$ = this.http
      .get<PokeApiItem>(`https://pokeapi.co/api/v2/item/${encodeURIComponent(key)}`)
      .pipe(
        map((data) => {
          const url = data.sprites?.default;
          if (!url) {
            return null;
          }
          return { url, alt: itemName?.trim() ?? key } satisfies ItemImage;
        }),
        catchError(() => of(null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.cache.set(key, { observable: request$ });
    return request$;
  }
}

interface PokeApiItem {
  name: string;
  sprites?: { default?: string | null };
}

/** Showdown item label → PokéAPI item id (kebab-case). */
export function normalizeItemId(itemName: string | null | undefined): string | null {
  if (!itemName?.trim()) {
    return null;
  }
  return itemName
    .trim()
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
