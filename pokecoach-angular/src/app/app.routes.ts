import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { TeamDetail } from './features/team-detail/team-detail';
import { Matchup } from './features/matchup/matchup';
import { NotFound } from './shared/not-found/not-found';
import { DesignSystem } from './features/developer/design-system';

const devRoutes: Routes = isDevMode()
  ? [{ path: 'developer/design-system', component: DesignSystem }]
  : [];

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'teams/:teamId', component: TeamDetail },
  { path: 'teams/:teamId/matchups/:matchupId', component: Matchup },
  ...devRoutes,
  { path: '**', component: NotFound },
];
