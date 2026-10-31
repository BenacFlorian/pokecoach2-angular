import { Component, input } from '@angular/core';
import type { Team } from '../../core/models/team.model';
import {
  PokemonPortrait,
  type DetailPopoverAlign,
} from '../pokemon/pokemon-portrait';

@Component({
  selector: 'app-team-strip',
  imports: [PokemonPortrait],
  templateUrl: './team-strip.html',
})
export class TeamStrip {
  readonly team = input.required<Team>();
  readonly pokemonDetailsOnHover = input(false);
  readonly detailPopoverAlign = input<DetailPopoverAlign>('start');
}
