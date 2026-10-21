import { LevelDef } from './types';

const E = '................................';
const F = '################################';

/**
 * Chapter 1 — Trust Nothing.
 * Each level teaches exactly one betrayal. Design beats are documented per
 * level as Setup → Bait → Betrayal → Recovery → Payoff.
 */
export const CH1: LevelDef[] = [
  {
    // Walk right, hop a spike, cross a gap on a bridge platform. Pure joy —
    // the game earns trust before it breaks it.
    id: '1-1', chapter: 1, index: 1, name: 'Warm Up',
    quip: 'Just walk to the door. Promise.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@.......X.......==.........G..',
      '##################...###########',
      '##################...###########',
      E,
    ],
    traps: [],
  },
  {
    // First betrayal: the long, safe-looking stretch of floor is hollow.
    // Bait: you sprint at it. Betrayal: it crumbles with a crack. Recovery:
    // keep moving — speed is safety. Payoff: door, and a new religion.
    id: '1-2', chapter: 1, index: 2, name: 'It Looked Solid',
    quip: 'The floor has opinions.',
    tip: 'Some floors crack before they drop. Keep moving.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@..........................G..',
      '#########ccccc##################',
      '#########.....##################',
      E,
    ],
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 420, tell: 'crack' } },
    ],
  },
  {
    // Floor section two bites back: hidden spikes. The crack is the tell.
    // Bait: another easy stretch. Betrayal: it grows teeth as you near.
    // Recovery: jump it or bait the pop. Payoff: spikes respect timing.
    id: '1-3', chapter: 1, index: 3, name: 'Now It Bites',
    quip: 'Lesson two: teeth.',
    tip: 'Teeth come out when you get close. Jump from a safe distance.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@..........................G..',
      '######.cc#####sss###..cc..######',
      '######...#####...###.....#######',
      E,
    ],
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 300, tell: 'crack' } },
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 60 }, params: { tell: 'crack' } },
    ],
  },
  {
    // The door develops anxiety. Bait: walk up to it. Betrayal: it hops away —
    // twice — before getting cornered against the wall. Pure slapstick.
    // Recovery: chase it into the corner. Payoff: you caught a door.
    id: '1-4', chapter: 1, index: 4, name: 'Cold Feet',
    quip: 'It is shy. Be gentle.',
    tip: 'It can only hop so far. Corner it.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@...................t........G',
      F,
      F,
      E,
    ],
    traps: [
      { id: 'g1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 95 }, params: { hops: 1 } },
    ],
  },
  {
    // Painted floor over the void. Bait: the low road looks fastest.
    // Betrayal: most of it isn't real. Recovery: the high road on planks —
    // and now you can jump UP THROUGH planks. Payoff: trust the wood.
    id: '1-5', chapter: 1, index: 5, name: 'The Nice Path',
    quip: 'The floor feels... hollow.',
    tip: 'Some floors are only painted on. Take the high road.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E,
      '.........==..==.................',
      '..@..........................G..',
      '########~~~~####################',
      '########....####################',
      E,
    ],
    traps: [],
  },
  {
    // Ceiling tax. Bait: a normal corridor. Betrayal: the ceiling drops a
    // block when you walk under it — then stays as a step you actually need.
    // Recovery: keep moving, or ride the new step. Payoff: danger = stairs.
    id: '1-6', chapter: 1, index: 6, name: 'Watch Your Head',
    quip: 'Gravity has a sense of humor.',
    tip: 'It drops when you walk under it. Keep moving.',
    map: [
      E, E, E, E,
      '............f...................',
      E, E, E, E, E, E, E,
      E,
      '...........zzzz.................',
      '..@..........................G..',
      F,
      F,
      E,
    ],
    traps: [
      { id: 'f1', type: 'fallblock', at: 'f', trigger: { event: 'enter-area', area: 'z', delay: 140 } },
    ],
  },
  {
    // The rude wall. Bait: open floor. Betrayal: a wall pops up in your path.
    // Recovery: hop it — it's only two tiles. Payoff: the game now jumps you.
    id: '1-7', chapter: 1, index: 7, name: 'Nope',
    quip: 'A wall appears! It is very rude.',
    tip: 'It pops up ahead of you. Hop over it.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E,
      '....................w...........',
      '..@.................w........G..',
      F,
      F,
      E,
    ],
    traps: [
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'proximity', distance: 90 } },
    ],
  },
  {
    // Pop quiz: crumble → teeth → a door that lies. The fake door poofs, the
    // real one is right behind it. Everything ch1 taught, in one short run.
    id: '1-8', chapter: 1, index: 8, name: 'Pop Quiz',
    quip: 'Everything you learned. At once.',
    tip: 'Fast feet, then jump the teeth. The fake door gives up first.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@..................d........G.',
      '#######.cc#####sss#####.########',
      '#######...#####...#####.########',
      E,
    ],
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 280, tell: 'crack' } },
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 60 }, params: { tell: 'crack' } },
      { id: 'd1', type: 'fakegoal', at: 'd', trigger: { event: 'touch' } },
    ],
  },
];
