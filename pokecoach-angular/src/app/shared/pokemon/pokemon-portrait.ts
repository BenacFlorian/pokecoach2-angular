import { Component, inject, input, signal } from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import type { PokemonSet } from '../../core/models/team.model';
import { PokemonImages } from '../../core/pokemon/pokemon-images';
import { PokemonNatureLabels } from '../../core/pokemon/pokemon-natures';

export type DetailPopoverAlign = 'start' | 'end';

@Component({
  selector: 'app-pokemon-portrait',
  imports: [AsyncPipe, NgTemplateOutlet],
  templateUrl: './pokemon-portrait.html',
})
export class PokemonPortrait {
  private readonly images = inject(PokemonImages);
  private readonly natureLabels = inject(PokemonNatureLabels);

  readonly pokemon = input.required<PokemonSet>();
  readonly showSetDetails = input(false);
  readonly detailPopoverAlign = input<DetailPopoverAlign>('start');

  readonly imageFailed = signal(false);

  imageFor(species: string) {
    return this.images.getImage(species);
  }

  onImageError(): void {
    this.imageFailed.set(true);
  }

  displayName(mon: PokemonSet): string {
    if (mon.nickname) {
      return `${mon.nickname} (${mon.species})`;
    }
    return mon.species;
  }

  detailSummaryId(mon: PokemonSet): string {
    return `poke-detail-${mon.slot}-${mon.species.replace(/\W/g, '-')}`;
  }

  natureDisplay(mon: PokemonSet): string {
    return (
      this.natureLabels.formatWithModifiers(mon.nature) ?? mon.nature ?? ''
    );
  }
}
