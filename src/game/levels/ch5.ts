import { LevelDef } from './types';
import { rows, full } from './build';

/**
 * Chapter 5 — Final Betrayal.
 * Night falls on the castle of floors. Every trick returns, remixed, and
 * the last level pretends to end twice.
 */
export const CH5: LevelDef[] = [
  {
    // A callback: it's level 1-1 again, by moonlight. The harmless dip now
    // has teeth, the friendly step crumbles onto spikes, and the door has
    // learned to run — all the way back to where you started.
    id: '5-1', chapter: 5, index: 1, name: 'Just Walk (Reprise)',
    quip: 'You have been here before. It remembers you too.',
    tip: 'Jump the old dip, skip the crumbly step, then chase the door home.',
    map: rows(
      '...........................G',
      '.....................###########',
      '..@.t...........cccc############',
      '##########sssss#XXXX############',
      full(),
      full(),
    ),
    traps: [
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 80 } },
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 160, tell: 'none' } },
      { id: 'g1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 90 }, params: { hops: 1 } },
    ],
  },
  {
    // Three pistons in a low hall, each less patient than the last. Bait
    // every one: step in, step back, slip under on the rise.
    id: '5-2', chapter: 5, index: 2, name: 'Crusher Gauntlet',
    quip: 'Three bouncers. None of them like you.',
    tip: 'Bait each piston, back off, walk under while it rises. The last one is quick.',
    map: rows(
      '......######################',
      '......######################',
      '.........kk.....jj.....ll',
      '.........kk.....jj.....ll',
      '',
      '..@...aa.zz..bb.yy..cc.xx.....G.',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'k1', type: 'crusher', at: 'k', to: 'z', trigger: { event: 'enter-area', area: 'a', delay: 320 }, params: { speed: 950 } },
      { id: 'j1', type: 'crusher', at: 'j', to: 'y', trigger: { event: 'enter-area', area: 'b', delay: 280 }, params: { speed: 950 } },
      { id: 'l1', type: 'crusher', at: 'l', to: 'x', trigger: { event: 'enter-area', area: 'c', delay: 240 }, params: { speed: 1000 } },
    ],
  },
  {
    // A gravity maze on a deadline: the first flip is only borrowed. Cross
    // the ceiling before it wears off, flip down, flip up again, and meet
    // the door where it hangs upside-down.
    id: '5-3', chapter: 5, index: 3, name: 'Gravity Maze',
    quip: 'The door is upside-down. So are you, soon.',
    tip: 'Don’t dawdle on the first ceiling — the flip wears off over teeth.',
    map: rows(
      full(),
      full(),
      '.........XX....bb............G',
      '...............bb',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '.....aa..................cc',
      '..@..aa.XXXXX......XXX...cc',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'a1', type: 'gravflip', at: 'a', trigger: { event: 'touch' }, params: { duration: 2600 } },
      { id: 'b1', type: 'gravflip', at: 'b', trigger: { event: 'touch' } },
      { id: 'c1', type: 'gravflip', at: 'c', trigger: { event: 'touch' } },
    ],
  },
  {
    // The pity party. Attempt one: a gap nobody can jump (the level says so).
    // Attempt two: the floor feels bad and grows you a pillar.
    id: '5-4', chapter: 5, index: 4, name: 'Pity Party',
    quip: 'This jump is impossible. Probably.',
    tip: 'Some gaps only close after you’ve tried. Try.',
    map: rows(
      '..@..........................G..',
      '##########...ppp...#############',
      '##########...ppp...#############',
      '##########...ppp...#############',
    ),
    traps: [
      { id: 'p1', type: 'wall', at: 'p', trigger: { event: 'attempt-gte', n: 2 }, params: { say: 'Fine. Have a pillar.' } },
    ],
  },
  {
    // The gauntlet: belt, crumbling bridge, a sweeping arm, blink steps,
    // and a piston guarding the door. Every chapter sent a representative.
    id: '5-5', chapter: 5, index: 5, name: 'The Gauntlet',
    quip: 'Every trap brought a friend.',
    tip: 'Belt, bridge, arm, steps, piston. One at a time.',
    map: rows(
      '..........................####',
      '..........................####',
      '...........................kk',
      '...........................kk',
      '',
      '...............o...........zz.G.',
      '.........................#######',
      '..................tt..tt.#######',
      '..@......................#######',
      '####vvvvvccc#####........#######',
      '#########...#####........#######',
      '#########...#####........#######',
    ),
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: 1, speed: 80 } },
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 200, tell: 'crack' } },
      { id: 'o1', type: 'spinner', at: 'o', trigger: { event: 'always' }, params: { len: 3, speed: 95 } },
      { id: 't1', type: 'timed', at: 't', trigger: { event: 'touch' }, params: { fuse: 800, off: 1200, cycle: true } },
      { id: 'k1', type: 'crusher', at: 'k', to: 'z', trigger: { event: 'always', delay: 600 }, params: { speed: 900, cycle: true } },
    ],
  },
  {
    // Door simulator: four identical doors. The first one is real — and it
    // bolts to the far end, behind three props. The props flanked by teeth
    // punish anyone who rushes them.
    id: '5-6', chapter: 5, index: 6, name: 'Door Simulator',
    quip: 'Four doors. One is honest. Eventually.',
    tip: 'The real door ran to the end. Jump the props — their floor bites.',
    map: rows(
      '..@......G....d....e....f...t...',
      '#############s#s##u#u###########',
      full(),
      full(),
    ),
    traps: [
      { id: 'd1', type: 'fakegoal', at: 'd', trigger: { event: 'touch' } },
      { id: 'e1', type: 'fakegoal', at: 'e', trigger: { event: 'touch' } },
      { id: 'f1', type: 'fakegoal', at: 'f', trigger: { event: 'touch' } },
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 50 } },
      { id: 's2', type: 'spikes', at: 'u', trigger: { event: 'proximity', distance: 50 } },
      { id: 'g1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 110 }, params: { hops: 1 } },
    ],
  },
  {
    // Everything at once: a belt pushing back, a crumbling bridge, a
    // sweeping arm, a flip onto a ceiling that is itself crumbling, and a
    // flip home to the door.
    id: '5-7', chapter: 5, index: 7, name: 'Everything at Once',
    quip: 'The examiners got creative.',
    tip: 'You land on a crumbling ceiling — keep moving, then jump the teeth.',
    map: rows(
      '####################qqqq########',
      '####################qqqq########',
      '..........................XX..bb',
      '..............................bb',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '...............o',
      '',
      '.................aa',
      '..@..............aa...........G.',
      '###vvvvvvcccc#####...........###',
      '#########....#####...........###',
      '#########....#####...........###',
    ),
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: -1, speed: 90 } },
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 200, tell: 'crack' } },
      { id: 'o1', type: 'spinner', at: 'o', trigger: { event: 'always' }, params: { len: 3, speed: 110 } },
      { id: 'a1', type: 'gravflip', at: 'a', trigger: { event: 'touch' } },
      { id: 'q1', type: 'collapse', at: 'q', trigger: { event: 'touch' }, params: { delay: 160, tell: 'crack' } },
      { id: 'b1', type: 'gravflip', at: 'b', trigger: { event: 'touch' } },
    ],
  },
  {
    // The finale. Sprint the crumbling bridge, bait the piston, reach the
    // exit… which flops over: it was a prop. The level, moved by your
    // persistence, assembles a staircase. The real door panics and bolts
    // onto the ceiling at the far end. Flip at the top and walk home upside
    // down for the last catch of the game.
    id: '5-8', chapter: 5, index: 8, name: 'The Final Betrayal',
    quip: 'You knew this was coming.',
    tip: 'The first door is a prop. Climb the new stairs, flip past the real door, walk the ceiling back.',
    map: rows(
      full(),
      full(),
      '........t.....XX....XX',
      '',
      '',
      '',
      '...............................v',
      '...........####..............G.v',
      '...........####...........######',
      '............kk..........gg######',
      '............kk..........gg######',
      '......................ffgg######',
      '......................ffgg######',
      '....................eeffgg######',
      '..@......yy.zz....d.eeffgg######',
      '###aaaaaa#######################',
      '###......#######################',
      '###......#######################',
    ),
    traps: [
      { id: 'a1', type: 'collapse', at: 'a', trigger: { event: 'touch' }, params: { fuse: 120, delay: 260, tell: 'crack' } },
      { id: 'k1', type: 'crusher', at: 'k', to: 'z', trigger: { event: 'enter-area', area: 'y', delay: 170 }, params: { speed: 950 } },
      { id: 'd1', type: 'fakegoal', at: 'd', trigger: { event: 'touch' } },
      { id: 'e1', type: 'wall', at: 'e', trigger: { event: 'trap-complete', ref: 'd1', delay: 250 }, params: { say: '…stairs?' } },
      { id: 'f1', type: 'wall', at: 'f', trigger: { event: 'trap-complete', ref: 'e1', delay: 120 } },
      { id: 'g1', type: 'wall', at: 'g', trigger: { event: 'trap-complete', ref: 'f1', delay: 120 }, params: { say: 'The level is HELPING?' } },
      { id: 'r1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 80 }, params: { hops: 1 } },
      { id: 'v1', type: 'gravflip', at: 'v', trigger: { event: 'touch' } },
    ],
  },
];
