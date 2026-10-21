import { LevelDef } from './types';
import { rows, full } from './build';

/**
 * Chapter 3 — The Rules Changed.
 * A crystal dreamscape where up is negotiable, the level remembers how you
 * died, and the ugly floor is the honest one.
 */
export const CH3: LevelDef[] = [
  {
    // Setup: a pit far too wide to jump, and a strange shimmer before it.
    // Surprise: step in and you fall… up. Walk the ceiling across.
    // Payoff: the second shimmer drops you gently at the door.
    id: '3-1', chapter: 3, index: 1, name: 'Upsies',
    quip: 'The arrows are not decorative.',
    tip: 'Walk into the shimmer. Trust the ceiling.',
    map: rows(
      full(),
      full(),
      '........................uu',
      '........................uu',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '.......vv',
      '..@....vv...................G',
      '##########............##########',
      '##########............##########',
      '##########............##########',
    ),
    traps: [
      { id: 'v1', type: 'gravflip', at: 'v', trigger: { event: 'touch' } },
      { id: 'u1', type: 'gravflip', at: 'u', trigger: { event: 'touch' } },
    ],
  },
  {
    // Setup: same trick, one shimmer only. Expectation: stroll the ceiling.
    // Surprise: the flip wears off — the upside-down is only rented.
    // Discovery: hurry, and hop (downward!) over the ceiling teeth.
    id: '3-2', chapter: 3, index: 2, name: 'Gravity Lease',
    quip: 'Up is temporary. Terms and conditions apply.',
    tip: 'The flip wears off. Don’t stop on the ceiling — jump the teeth.',
    map: rows(
      full(),
      full(),
      '..............XX',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '.....vv',
      '..@..vv......................G',
      '########................########',
      '########................########',
      '########................########',
    ),
    traps: [
      { id: 'v1', type: 'gravflip', at: 'v', trigger: { event: 'touch' }, params: { duration: 2900 } },
    ],
  },
  {
    // The level remembers. Attempt one: an honest bridge and teeth by the
    // door. Attempt two: the teeth are gone — and the bridge noticed you.
    // Recovery: the planks were always there.
    id: '3-3', chapter: 3, index: 3, name: 'The Floor Remembers',
    quip: 'It is different this time. It noticed you.',
    tip: 'After a death the bridge gives way. Take the planks.',
    map: rows(
      '............======',
      '',
      '..@..........................G',
      '#############ccc######s#########',
      '#############...################',
      '#############...################',
    ),
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'attempt-gte', n: 2 }, params: { tell: 'crack', delay: 160 } },
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'attempt-eq', n: 1 } },
    ],
  },
  {
    // Two buttons. The first one is a trap: it slams a brick up in front
    // of you. The second is the real door release. Read the room — or jump.
    id: '3-4', chapter: 3, index: 4, name: 'Button Mash',
    quip: 'That was the doorbell, not the door.',
    tip: 'The first button builds a wall. Hop it — the second one opens the door.',
    map: rows(
      '....................w',
      '....................w',
      '....................w',
      '..@.....p...k...q...w........G',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'p1', type: 'plate', at: 'p', trigger: { event: 'touch' } },
      { id: 'q1', type: 'plate', at: 'q', trigger: { event: 'touch' } },
      { id: 'k1', type: 'wall', at: 'k', trigger: { event: 'press', ref: 'p1' } },
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'press', ref: 'q1', delay: 60 }, params: { dir: -1 } },
    ],
  },
  {
    // Inversion: stepping stones over a pit. The clean ones are paint; the
    // cracked, ugly ones are the only real floor in this level.
    id: '3-5', chapter: 3, index: 5, name: 'Cracked Means Safe',
    quip: 'Here, ugly is good.',
    tip: 'Step only on the cracked stones. The clean ones are paint.',
    map: rows(
      '',
      '.....ccc.ggg.ccc.ggg.ccc',
      '',
      '..@...........................G',
      '####.......................#####',
      '####.......................#####',
      '####.......................#####',
    ),
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'attempt-gte', n: 999 }, params: { tell: 'crack' } },
      { id: 'g1', type: 'ghost', at: 'g', trigger: { event: 'always' } },
    ],
  },
  {
    // Jump the floor teeth, flip, then jump the ceiling teeth — "down" is
    // the new up. One lesson: your jump always pushes away from your feet.
    id: '3-6', chapter: 3, index: 6, name: 'Gravity Lane',
    quip: 'Up is a suggestion.',
    tip: 'Upside-down, jump still means “away from the floor you stand on”.',
    map: rows(
      full(),
      full(),
      '....................XXX..bb',
      '.........................bb',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '...........aa',
      '..@...XXX..aa.................G',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'a1', type: 'gravflip', at: 'a', trigger: { event: 'touch' } },
      { id: 'b1', type: 'gravflip', at: 'b', trigger: { event: 'touch' } },
    ],
  },
  {
    // It learns. Attempt one: the bridge is honest and the sting waits by
    // the door. Attempt two: no bridge — and the high road's landing is
    // booby-trapped too. Attempt three: you know everything. Probably.
    id: '3-7', chapter: 3, index: 7, name: 'It Learns',
    quip: 'Second visit? The level studied your replay.',
    tip: 'It adapts each try. Bridge gone? Take the planks and jump the landing.',
    map: rows(
      '.................==',
      '..............==',
      '',
      '..@..........................G',
      '#############ccc##q#w###########',
      '#############...################',
      '#############...################',
    ),
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'attempt-gte', n: 2 }, params: { tell: 'crack', delay: 160 } },
      { id: 's1', type: 'spikes', at: 'q', trigger: { event: 'attempt-eq', n: 1 } },
      { id: 's2', type: 'spikes', at: 'w', trigger: { event: 'attempt-gte', n: 2 } },
    ],
  },
  {
    // Rules lawyer: press the plate to open the gate. The door, cornered,
    // flees — up onto the ceiling behind you. The only shimmer is past
    // where it used to be. Flip, walk the ceiling home, mind the teeth.
    id: '3-8', chapter: 3, index: 8, name: 'Rules Lawyer',
    quip: 'Technically, the door is still in the level.',
    tip: 'Flip at the far shimmer and walk the ceiling back to the door.',
    map: rows(
      full(),
      full(),
      '..........t..XX.........',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '................w',
      '................w..........vv',
      '................w..........vv',
      '..@.p...........w......G...vv',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'p1', type: 'plate', at: 'p', trigger: { event: 'touch' } },
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'press', ref: 'p1', delay: 80 }, params: { dir: -1 } },
      { id: 'g1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 90 }, params: { hops: 1 } },
      { id: 'v1', type: 'gravflip', at: 'v', trigger: { event: 'touch' } },
    ],
  },
];
