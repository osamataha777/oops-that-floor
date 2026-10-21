import { LevelDef } from './types';

const E = '................................';
const F = '################################';

/** Chapter 4 — Chaos Academy. Everything you know, combined. */
export const CH4: LevelDef[] = [
  {
    id: '4-1', chapter: 4, index: 1, name: 'Combo Meal',
    quip: 'A belt, a bridge, and some teeth.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@..........................G..',
      '######vvvv..cc#####s############',
      '##########....##################',
    ],
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: 1, speed: 70 } },
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 200, tell: 'crack' } },
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 60 }, params: { tell: 'crack' } },
    ],
  },
  {
    id: '4-2', chapter: 4, index: 2, name: 'Bounce House',
    quip: 'Shy steps and one very angry fan.',
    tip: 'The arm only reaches so far. Time the middle hop.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E,
      '...............o................',
      E,
      '.........t...t...t..............',
      '..@.........................G...',
      '########................########',
      '########................########',
    ],
    traps: [
      { id: 't1', type: 'timed', at: 't', trigger: { event: 'touch' }, params: { fuse: 800, off: 1300, cycle: true } },
      { id: 'o1', type: 'spinner', at: 'o', trigger: { event: 'always', delay: 500 }, params: { len: 2, speed: 95 } },
    ],
  },
  {
    id: '4-3', chapter: 4, index: 3, name: 'Red Light',
    quip: 'Rhythm game. With consequences.',
    map: [
      E, E, E, E,
      '....................kk..........',
      E, E, E, E, E, E, E, E,
      E,
      E,
      '..@...............zzzz......G...',
      '##########ssss##################',
      F,
    ],
    traps: [
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'always', delay: 400 }, params: { period: 1500, hold: 650 } },
      { id: 'k1', type: 'crusher', at: 'k', to: 'z', trigger: { event: 'always', delay: 700 }, params: { speed: 950, cycle: true } },
    ],
  },
  {
    id: '4-4', chapter: 4, index: 4, name: 'Group Project',
    quip: 'The button, the belt-car, and the door.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      '............mm..nn.w............',
      '..@..p.............w........G...',
      '##########........##############',
      '##########........##############',
    ],
    traps: [
      { id: 'p1', type: 'plate', at: 'p', trigger: { event: 'touch' } },
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'press', ref: 'p1' }, params: { dir: -1 } },
      { id: 'm1', type: 'mover', at: 'm', to: 'n', trigger: { event: 'always', delay: 500 }, params: { speed: 110, cycle: true } },
    ],
  },
  {
    id: '4-5', chapter: 4, index: 5, name: 'Overcooked',
    quip: 'Every appliance is on.',
    map: [
      E, E, E, E,
      '.........................f......',
      E, E, E, E, E, E, E, E,
      E,
      '..............t...t.............',
      '..@....................zzzz.G...',
      '########vvvv............########',
      '############............########',
    ],
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: 1, speed: 70 } },
      { id: 't1', type: 'timed', at: 't', trigger: { event: 'touch' }, params: { fuse: 750, off: 1250, cycle: true } },
      { id: 'f1', type: 'fallblock', at: 'f', trigger: { event: 'enter-area', area: 'z', delay: 140 } },
    ],
  },
  {
    id: '4-6', chapter: 4, index: 6, name: 'The Audition',
    quip: 'Two doors audition. One gets the part.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@...................d..t...G..',
      '####################s###########',
      F,
    ],
    traps: [
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 60 }, params: { tell: 'crack' } },
      { id: 'd1', type: 'fakegoal', at: 'd', trigger: { event: 'touch' } },
      { id: 'g1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 85 }, params: { hops: 1 } },
    ],
  },
  {
    id: '4-7', chapter: 4, index: 7, name: 'Trust Fall',
    quip: 'Only the ugly steps are real. Briefly.',
    tip: 'Cracked = real for ~a second. Clean = never real.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E,
      '.........ccc..gg..ccc..gg.......',
      E,
      '..@..........................G..',
      '########.................#######',
      '########.................#######',
    ],
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { fuse: 150, delay: 200, tell: 'crack' } },
      { id: 'g1', type: 'ghost', at: 'g', trigger: { event: 'always' } },
    ],
  },
  {
    id: '4-8', chapter: 4, index: 8, name: 'Final Exam I',
    quip: 'Chapter four sends its regards.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E,
      '..............o.................',
      '.............t.t.t..............',
      E,
      '..@......................e.e..G.',
      '######vv..cc.......###########..',
      '########..........##############',
    ],
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: 1, speed: 75 } },
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 200, tell: 'crack' } },
      { id: 'o1', type: 'spinner', at: 'o', trigger: { event: 'always', delay: 400 }, params: { len: 2, speed: 100 } },
      { id: 't1', type: 'timed', at: 't', trigger: { event: 'touch' }, params: { fuse: 750, off: 1200, cycle: true } },
      { id: 'g1', type: 'shygoal', at: 'G', to: 'e', trigger: { event: 'proximity', distance: 80 }, params: { hops: 2 } },
    ],
  },
];
