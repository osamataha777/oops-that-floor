import { LevelDef } from './types';

const E = '................................';
const F = '################################';

/** Chapter 4 — Chaos Academy. Everything you know, combined. */
export const CH4: LevelDef[] = [
  {
    id: '4-1', chapter: 4, index: 1, name: 'Combo Meal',
    tip: 'The belt carries you onto cracking floor. Keep those feet moving.',
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
    tip: 'The spikes pulse on a rhythm. Move on the off-beat.',
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
    id: '4-4', chapter: 4, index: 4, name: 'The Helpful Wall',
    tip: 'Press the button, then look behind you — the pit grew a bridge.',
    quip: 'The level slammed a bridge into existence. For you.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      '....................w...........',
      '..@..p...............w......G...',
      '##########..kkkkk..#############',
      '##########..........############',
    ],
    traps: [
      { id: 'p1', type: 'plate', at: 'p', trigger: { event: 'touch' } },
      // The door sinks…
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'press', ref: 'p1' }, params: { dir: -1 } },
      // …and the moment it finishes, a bridge erupts in the pit behind you.
      { id: 'k1', type: 'wall', at: 'k', trigger: { event: 'trap-complete', ref: 'w1', delay: 60 }, params: { dir: 1 } },
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
    tip: 'One door lies, one door runs, one is real. Audition them all.',
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
    tip: 'Zigzag up. Two steps are painted on — the cracked ones hold, briefly.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E,
      '...........dd....hh.....gg......',
      '........cc....gg....jj..........',
      E,
      '..@..........................G..',
      '########................########',
      '########................########',
    ],
    traps: [
      // Each step is its own trap — it crumbles ~400ms after YOU touch it.
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { fuse: 120, delay: 280, tell: 'crack' } },
      { id: 'd1', type: 'collapse', at: 'd', trigger: { event: 'touch' }, params: { fuse: 120, delay: 280, tell: 'crack' } },
      { id: 'h1', type: 'collapse', at: 'h', trigger: { event: 'touch' }, params: { fuse: 120, delay: 280, tell: 'crack' } },
      { id: 'j1', type: 'collapse', at: 'j', trigger: { event: 'touch' }, params: { fuse: 120, delay: 280, tell: 'crack' } },
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
