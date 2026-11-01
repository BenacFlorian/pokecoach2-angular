import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { GameplanReport } from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';

@Component({
  selector: 'app-gameplan-tab',
  imports: [TranslocoPipe],
  templateUrl: './gameplan.html',
})
export class GameplanTab {
  readonly ourTeam = input.required<Team>();
  readonly opponentTeam = input.required<Team>();
  readonly gameplan = input<GameplanReport | null>(null);
  readonly generating = input(false);
  readonly synthesisUnavailable = input(false);
}
