import { LevelDef } from './types';

const E = '................................';
const F = '################################';

/** Chapter 3 — The Rules Changed. */
export const CH3: LevelDef[] = [
  {
    id: '3-1', chapter: 3, index: 1, name: 'It Fled',
    quip: 'The exit has legs now.',
    tip: 'It can only run twice. Corner it.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@...............t....t....G...',
      F,
      F,
    ],
    traps: [
      { id: 'g1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 85 }, params: { hops: 2 } },
    ],
  },
  {
    id: '3-2', chapter: 3, index: 2, name: 'Upsies',
    quip: 'The arrows are not decorative.',
    tip: 'Step into the shimmer. Walk the ceiling.',
    map: [
      F,
      '###########################.####',
      '...........................G....',
      E, E, E, E, E, E, E, E, E, E, E,
      '..............vvvv..............',
      '..@.............................',
      F,
      F,
    ],
    traps: [
      { id: 'v1', type: 'gravflip', at: 'v', trigger: { event: 'touch' } },
    ],
  },
  {
    id: '3-3', chapter: 3, index: 3, name: 'The Floor Remembers',
    quip: 'It is different this time. It noticed you.',
    tip: 'Died once? The bridge is gone now. Take the high road.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E,
      '.................==.............',
      '..............==................',
      E,
      '..@..........................G..',
      '#############ccc######s#########',
      '#############...################',
    ],
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'attempt-gte', n: 2 }, params: { tell: 'crack' } },
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'attempt-eq', n: 1 } },
    ],
  },
  {
    id: '3-4', chapter: 3, index: 4, name: 'Button Mash',
    quip: 'That was the doorbell, not the door.',
    tip: 'The first button builds a wall. The second one opens it.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '....................w...........',
      '..@.....p...k...q...w........G..',
      F,
      F,
    ],
    traps: [
      { id: 'p1', type: 'plate', at: 'p', trigger: { event: 'touch' } },
      { id: 'q1', type: 'plate', at: 'q', trigger: { event: 'touch' } },
      // Betrayal: the obvious button slams a floor-brick up in your path.
      { id: 'k1', type: 'wall', at: 'k', trigger: { event: 'press', ref: 'p1' }, params: { dir: 1, delay: 60 } },
      // The second plate is the real door release.
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'press', ref: 'q1' }, params: { dir: -1, delay: 60 } },
    ],
  },
  {
    id: '3-5', chapter: 3, index: 5, name: 'Cracked Means Safe',
    quip: 'Here, ugly is good.',
    tip: 'Step only on the cracked ones. The clean ones are paint.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '.........cc.gg.cc.gg.cc.........',
      E,
      '..@..........................G..',
      '########................########',
      '########................########',
    ],
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'attempt-gte', n: 99 }, params: { tell: 'crack' } },
      { id: 'g1', type: 'ghost', at: 'g', trigger: { event: 'always' } },
    ],
  },
  {
    id: '3-6', chapter: 3, index: 6, name: 'Gravity Lane',
    quip: 'Up is a suggestion.',
    map: [
      F, F,
      '.....................u..........',
      E, E, E, E, E, E, E, E, E, E, E,
      '..........v.....................',
      '..@.........XXXXXXX..........G..',
      F,
      F,
    ],
    traps: [
      { id: 'v1', type: 'gravflip', at: 'v', trigger: { event: 'touch' } },
      { id: 'u1', type: 'gravflip', at: 'u', trigger: { event: 'touch' } },
    ],
  },
  {
    id: '3-7', chapter: 3, index: 7, name: 'It Learns',
    quip: 'Second visit? The level studied your replay.',
    tip: 'It adapts every visit. Attempt two: no bridge — and the other route is booby-trapped too.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E,
      '.................==.............',
      '..............==................',
      E,
      '..@..........................G..',
      '#############ccc##q#w###########',
      '#############...################',
    ],
    traps: [
      // Attempt 1: bridge is honest — the sting waits at the far end ('q').
      // Attempt 2+: bridge gone ('c') AND the high-road landing is armed ('w').
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'attempt-gte', n: 2 }, params: { tell: 'crack' } },
      { id: 's1', type: 'spikes', at: 'q', trigger: { event: 'attempt-eq', n: 1 } },
      { id: 's2', type: 'spikes', at: 'w', trigger: { event: 'attempt-gte', n: 2 } },
    ],
  },
  {
    id: '3-8', chapter: 3, index: 8, name: 'Rules Lawyer',
    quip: 'Press, sink, fly. In that order.',
    tip: 'Jump INTO the shimmer off the ledge.',
    map: [
      F,
      '###########################.####',
      '...........................G....',
      E, E, E, E, E, E, E, E, E, E, E,
      '.............wvvv...............',
      '..@...p......w..................',
      '##############..................',
      '##############..................',
    ],
    traps: [
      { id: 'p1', type: 'plate', at: 'p', trigger: { event: 'touch' } },
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'press', ref: 'p1' }, params: { dir: -1 } },
      { id: 'v1', type: 'gravflip', at: 'v', trigger: { event: 'touch' } },
    ],
  },
];
