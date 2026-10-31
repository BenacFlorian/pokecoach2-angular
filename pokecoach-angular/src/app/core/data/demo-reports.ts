import type {
  BattleAction,
  Frequency,
  GameplanReport,
  LeadRecommendation,
  MatchupReport,
  OpponentLeadStats,
  PokemonRef,
  SelectionResult,
} from '../models/matchup.model';
import type { PokemonSlot, Team } from '../models/team.model';
import {
  opponentLeadId,
} from '../matchup/matchup-display';

const PHASE_A = 1000;
const PHASE_B = 50;
const PHASE_C = 50;
const PHASE_D = 10;

const LEAD_COUNTS: readonly [number, number, number, number] = [
  420, 270, 180, 130,
];

export function buildMockMatchupReport(
  ours: Team,
  opponent: Team,
): MatchupReport {
  const leadPairs: readonly [PokemonSlot, PokemonSlot][] = [
    [0, 1],
    [0, 2],
    [2, 3],
    [4, 5],
  ];

  const opponentLeads = leadPairs.map((leadSlots, index) =>
    buildLeadStats(opponent, leadSlots, LEAD_COUNTS[index], index),
  );

  const ourFour: readonly [PokemonSlot, PokemonSlot, PokemonSlot, PokemonSlot] =
    [0, 2, 3, 5];
  const ourLead: readonly [PokemonSlot, PokemonSlot] = [0, 2];

  const selectionComparisons = buildSelectionComparisons(
    opponentLeads.slice(0, 3).map((l) => l.id),
    ourFour,
    ourLead,
  );

  const leadRecommendation = buildLeadRecommendation(
    ours,
    opponent,
    opponentLeads,
    ourFour,
    ourLead,
    selectionComparisons,
  );

  const gameplan = buildGameplan(ours, opponent);

  return {
    source: 'mock',
    fixtureVersion: 1,
    phaseASampleSize: PHASE_A,
    phaseBSampleSize: PHASE_B,
    phaseCSampleSize: PHASE_C,
    phaseDSampleSize: PHASE_D,
    opponentLeads,
    selectionComparisons,
    leadRecommendation,
    gameplan,
  };
}

function ref(side: PokemonRef['side'], slot: PokemonSlot): PokemonRef {
  return { side, slot };
}

function moveAction(
  side: PokemonRef['side'],
  slot: PokemonSlot,
  move: string,
  targetSlot: PokemonSlot,
  targetSide: PokemonRef['side'],
  terastallize?: string,
): BattleAction {
  return {
    kind: 'move',
    actor: ref(side, slot),
    move,
    targets: [{ kind: 'pokemon', ref: ref(targetSide, targetSlot) }],
    terastallize,
  };
}

function buildLeadStats(
  opponent: Team,
  leadSlots: readonly [PokemonSlot, PokemonSlot],
  phaseACount: number,
  index: number,
): OpponentLeadStats {
  const [a, b] = leadSlots;
  const moveA = opponent.pokemon[a].moves[0] ?? 'Protect';
  const moveB = opponent.pokemon[b].moves[0] ?? 'Protect';
  const moveA2 = opponent.pokemon[a].moves[1] ?? moveA;
  const moveB2 = opponent.pokemon[b].moves[1] ?? moveB;

  const jointTurn1Actions: Frequency<readonly [BattleAction, BattleAction]>[] = [
    {
      value: [
        moveAction('opponent', a, moveA, 0, 'ours'),
        moveAction('opponent', b, moveB, 2, 'ours'),
      ],
      count: 22,
      sampleSize: PHASE_B,
    },
    {
      value: [
        {
          kind: 'switch',
          actor: ref('opponent', a),
          switchTo: ref('opponent', backSlotsForLead(leadSlots)[0]),
        },
        {
          kind: 'move',
          actor: ref('opponent', b),
          move: moveB,
          targets: [{ kind: 'zone', zone: 'all-opponents' }],
        },
      ],
      count: 14,
      sampleSize: PHASE_B,
    },
    {
      value: [
        moveAction('opponent', a, moveA2, 1, 'ours'),
        moveAction('opponent', b, moveB2, 3, 'ours'),
      ],
      count: 9,
      sampleSize: PHASE_B,
    },
    {
      value: [
        moveAction('opponent', a, moveA, 0, 'ours'),
        {
          kind: 'switch',
          actor: ref('opponent', b),
          switchTo: ref('opponent', backSlotsForLead(leadSlots)[1]),
        },
      ],
      count: 5,
      sampleSize: PHASE_B,
    },
  ];

  const backPairs = buildBackPairDistribution(opponent, leadSlots, index);

  return {
    id: opponentLeadId(opponent, leadSlots),
    leadSlots,
    phaseASampleSize: PHASE_A,
    phaseACount,
    jointTurn1Actions,
    backPairs,
    backSlotMarginals: [
      { value: backPairs[0].value[0], count: 32, sampleSize: PHASE_B },
      { value: backPairs[0].value[1], count: 30, sampleSize: PHASE_B },
    ],
    turn1EndObservations: [
      `Pression sur ${opponent.pokemon[a].species} après le tour 1 (fixture).`,
      `Répartition des backs conditionnelle à ce lead (données fictives).`,
    ],
  };
}

const ALL_SLOTS: PokemonSlot[] = [0, 1, 2, 3, 4, 5];

function backSlotsForLead(
  lead: readonly [PokemonSlot, PokemonSlot],
): PokemonSlot[] {
  return ALL_SLOTS.filter((s) => s !== lead[0] && s !== lead[1]);
}

function allBackPairs(
  lead: readonly [PokemonSlot, PokemonSlot],
): [PokemonSlot, PokemonSlot][] {
  const slots = backSlotsForLead(lead);
  const pairs: [PokemonSlot, PokemonSlot][] = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      pairs.push([slots[i], slots[j]]);
    }
  }
  return pairs;
}

/** Répartit PHASE_B sur toutes les paires de back possibles (somme = 100 %). */
function buildBackPairDistribution(
  _opponent: Team,
  leadSlots: readonly [PokemonSlot, PokemonSlot],
  seed: number,
): Frequency<readonly [PokemonSlot, PokemonSlot]>[] {
  const pairs = allBackPairs(leadSlots);
  const weights = pairs.map((_, i) => Math.max(1, 7 - ((i + seed) % 5)));
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let assigned = 0;
  return pairs.map((pair, i) => {
    if (i === pairs.length - 1) {
      return { value: pair, count: PHASE_B - assigned, sampleSize: PHASE_B };
    }
    const count = Math.round((weights[i] / totalWeight) * PHASE_B);
    assigned += count;
    return { value: pair, count, sampleSize: PHASE_B };
  });
}

function buildSelectionComparisons(
  studiedLeadIds: readonly string[],
  ourFour: readonly [PokemonSlot, PokemonSlot, PokemonSlot, PokemonSlot],
  ourLead: readonly [PokemonSlot, PokemonSlot],
): SelectionResult[] {
  const results: SelectionResult[] = [];
  for (const leadId of studiedLeadIds) {
    results.push({
      opponentLeadId: leadId,
      ourFourSlots: ourFour,
      ourLeadSlots: ourLead,
      wins: 28,
      losses: 18,
      draws: 4,
      sampleSize: PHASE_C,
    });
    results.push({
      opponentLeadId: leadId,
      ourFourSlots: [0, 1, 4, 5],
      ourLeadSlots: [0, 1],
      wins: 22,
      losses: 24,
      draws: 4,
      sampleSize: PHASE_C,
    });
  }
  return results;
}

function buildLeadRecommendation(
  ours: Team,
  opponent: Team,
  leads: OpponentLeadStats[],
  ourFour: readonly [PokemonSlot, PokemonSlot, PokemonSlot, PokemonSlot],
  ourLead: readonly [PokemonSlot, PokemonSlot],
  selectionResults: SelectionResult[],
): LeadRecommendation {
  const studied = leads.slice(0, 3).map((lead) => {
    const [ls0, ls1] = lead.leadSlots;
    const move0 = opponent.pokemon[ls0].moves[0] ?? 'Protect';
    const move1 = opponent.pokemon[ls1].moves[0] ?? 'Protect';
    const ourMove0 = ours.pokemon[ourLead[0]].moves[0] ?? 'Protect';
    const ourMove1 = ours.pokemon[ourLead[1]].moves[0] ?? 'Protect';
    return {
      opponentLeadId: lead.id,
      primaryActions: [
        moveAction('ours', ourLead[0], ourMove0, ls0, 'opponent'),
        moveAction('ours', ourLead[1], ourMove1, ls1, 'opponent'),
      ] as [BattleAction, BattleAction],
      alternatives: [
        `Pivoter ${ours.pokemon[ourLead[0]].species} après ${move0} adverse.`,
        `Conserver ${ours.pokemon[ourLead[1]].species} si ${move1} vise un allié.`,
      ],
      adaptations: [
        `Anticiper ${move0} + ${move1} avec spread depuis ${ours.pokemon[ourFour[2]].species}.`,
      ],
    };
  });

  return {
    ourFourSlots: ourFour,
    ourLeadSlots: ourLead,
    justification: `Lead ${ours.pokemon[ourLead[0]].species}/${ours.pokemon[ourLead[1]].species} recommandé sur l’échantillon fictif (56 % de victoires).`,
    selectionResults,
    studiedLeads: studied,
  };
}

function buildGameplan(ours: Team, opponent: Team): GameplanReport {
  return {
    opening: `Ouvrir avec ${ours.pokemon[0].species} et ${ours.pokemon[2].species} pour absorber la pression de ${opponent.pokemon[0].species}.`,
    midgame: `Utiliser ${ours.pokemon[3].species} pour contrôler le tempo une fois les leads adverses identifiés.`,
    endgame: `Clôturer avec ${ours.pokemon[5].species} si ${opponent.pokemon[4].species} est encore en jeu.`,
    threats: [
      {
        label: opponent.pokemon[1].species,
        detail: 'Menace principale si libre au tour 2 (données fictives).',
      },
      {
        label: opponent.pokemon[2].species,
        detail: 'À surveiller après Téracristallisation (fixture).',
      },
    ],
    preserve: [ours.pokemon[0].species, ours.pokemon[3].species],
    eliminate: [opponent.pokemon[1].species, opponent.pokemon[2].species],
    adaptations: [
      `Basculer ${ours.pokemon[4].species} si ${opponent.pokemon[3].species} impose Tailwind.`,
    ],
    winCondition: `Empêcher ${opponent.pokemon[1].species} de sweep après la phase midgame ; conserver ${ours.pokemon[0].species} pour le clutch.`,
    refinementSequences: [
      {
        label: 'Séquence D-1',
        detail: `${ours.pokemon[2].species} reste en lead si ${opponent.pokemon[0].species} part en back (10 parties fictives).`,
      },
      {
        label: 'Séquence D-2',
        detail: `Tera ${ours.pokemon[0].species} utilisé contre ${opponent.pokemon[2].species} dans 6/10 affinages simulés.`,
      },
    ],
    sampleLimitation:
      'Échantillon de démonstration : les fréquences illustrent un futur modèle, pas le meta réel.',
  };
}

export function validateReportInvariants(report: MatchupReport): string[] {
  const errors: string[] = [];
  const sumA = report.opponentLeads.reduce((s, l) => s + l.phaseACount, 0);
  if (sumA !== report.phaseASampleSize) {
    errors.push(`Phase A: somme ${sumA} ≠ ${report.phaseASampleSize}`);
  }
  for (const lead of report.opponentLeads) {
    const [a, b] = lead.leadSlots;
    const jointSum = lead.jointTurn1Actions.reduce((s, j) => s + j.count, 0);
    if (jointSum !== PHASE_B) {
      errors.push(`Joint actions ${lead.id}: somme ${jointSum} ≠ ${PHASE_B}`);
    }
    const backSum = lead.backPairs.reduce((s, bp) => s + bp.count, 0);
    if (backSum !== PHASE_B) {
      errors.push(`Back pairs ${lead.id}: somme ${backSum} ≠ ${PHASE_B}`);
    }
    for (const back of lead.backPairs) {
      if (back.value.includes(a) || back.value.includes(b)) {
        errors.push(`Back chevauche le lead ${lead.id}`);
      }
    }
  }
  for (const sel of report.selectionComparisons) {
    if (sel.wins + sel.losses + sel.draws !== sel.sampleSize) {
      errors.push(`Selection ${sel.opponentLeadId}: W+L+D ≠ sampleSize`);
    }
  }
  return errors;
}
