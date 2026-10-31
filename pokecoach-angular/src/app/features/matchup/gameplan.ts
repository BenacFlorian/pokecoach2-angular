import { Component, input } from '@angular/core';
import type { GameplanReport } from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';

@Component({
  selector: 'app-gameplan-tab',
  imports: [],
  templateUrl: './gameplan.html',
})
export class GameplanTab {
  readonly ourTeam = input.required<Team>();
  readonly opponentTeam = input.required<Team>();
  readonly gameplan = input.required<GameplanReport>();
}
