import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

function teamIdFromMatchupUrl(url: string): string | null {
  const path = url.split('?')[0] ?? url;
  const match = path.match(/^\/teams\/([^/]+)\/matchups\/[^/]+$/);
  return match?.[1] ?? null;
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly router = inject(Router);

  readonly teamBackId = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => teamIdFromMatchupUrl(this.router.url)),
      startWith(teamIdFromMatchupUrl(this.router.url)),
    ),
    { initialValue: teamIdFromMatchupUrl(this.router.url) },
  );
}
