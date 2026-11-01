import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '../../core/i18n/transloco-loader';
import type { OpponentLeadStats } from '../../core/models/matchup.model';
import type { Team } from '../../core/models/team.model';
import { MatchupRightColumn } from './matchup-right-column';

const stubTeam = (label: string): Team =>
  ({
    id: label,
    name: label,
    pokemon: Array.from({ length: 6 }, (_, i) => ({
      species: `${label}-${i}`,
      slot: i,
    })),
  }) as unknown as Team;

const leads: OpponentLeadStats[] = [
  {
    id: 'l1',
    leadSlots: [0, 1],
    phaseACount: 10,
    phaseASampleSize: 20,
    jointTurn1Actions: [],
    backPairs: [],
    backSlotMarginals: [],
    turn1EndObservations: [],
  },
  {
    id: 'l2',
    leadSlots: [2, 3],
    phaseACount: 5,
    phaseASampleSize: 20,
    jointTurn1Actions: [],
    backPairs: [],
    backSlotMarginals: [],
    turn1EndObservations: [],
  },
];

describe('MatchupRightColumn accordion', () => {
  let fixture: ComponentFixture<MatchupRightColumn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchupRightColumn],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransloco({
          config: { availableLangs: ['fr'], defaultLang: 'fr' },
          loader: TranslocoHttpLoader,
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MatchupRightColumn);
    fixture.componentRef.setInput('contextKey', 't:m:r1');
    fixture.componentRef.setInput('ourTeam', stubTeam('ours'));
    fixture.componentRef.setInput('opponentTeam', stubTeam('opp'));
    fixture.componentRef.setInput('leads', leads);
    fixture.detectChanges();
  });

  function headerButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button[type="button"]'));
  }

  it('starts with all leads collapsed', () => {
    expect(fixture.componentInstance.expandedLeadId()).toBeNull();
  });

  it('opens one lead and closes the previous on another click', () => {
    const [b1, b2] = headerButtons();
    b1.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.expandedLeadId()).toBe('l1');
    b2.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.expandedLeadId()).toBe('l2');
  });

  it('collapses when clicking the open lead again', () => {
    const [b2] = headerButtons().slice(1);
    b2.click();
    fixture.detectChanges();
    b2.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.expandedLeadId()).toBeNull();
  });

  it('toggles with Enter key', () => {
    const btn = headerButtons()[0];
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.expandedLeadId()).toBe('l1');
  });
});
