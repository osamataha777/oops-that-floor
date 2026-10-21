import { LevelDef } from './types';

const E = '................................';
const F = '################################';

/** Chapter 1 — Trust Nothing. */
export const CH1: LevelDef[] = [
  {
    id: '1-1', chapter: 1, index: 1, name: 'Warm Up',
    quip: 'Just walk to the door. Promise.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@.......X...................G.',
      '##################..############',
      '##################..############',
    ],
    traps: [],
  },
  {
    id: '1-2', chapter: 1, index: 2, name: 'It Looked Solid',
    quip: 'The floor has opinions.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@..........................G..',
      '#########ccc####################',
      F,
    ],
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 250, tell: 'crack' } },
    ],
  },
  {
    id: '1-3', chapter: 1, index: 3, name: 'Now It Bites',
    quip: 'Lesson two: teeth.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@..........................G..',
      '######..cc############s#..######',
      '######....##############..######',
    ],
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 220, tell: 'crack' } },
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 55 }, params: { tell: 'crack' } },
    ],
  },
  {
    id: '1-4', chapter: 1, index: 4, name: 'Pick a Door',
    quip: 'One of these is a door.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@..................d......G...',
      F,
      F,
    ],
    traps: [
      { id: 'd1', type: 'fakegoal', at: 'd', trigger: { event: 'touch' } },
    ],
  },
  {
    id: '1-5', chapter: 1, index: 5, name: 'The Nice Path',
    quip: 'The floor feels... hollow.',
    tip: 'Some floors are only painted on. Take the high road.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '.........==.==..................',
      E,
      '..@..........................G..',
      '########gggg####################',
      '########....####################',
    ],
    traps: [],
  },
  {
    id: '1-6', chapter: 1, index: 6, name: 'Watch Your Head',
    quip: 'Gravity has a sense of humor.',
    tip: 'It drops when you walk under it. Keep moving.',
    map: [
      E, E, E, E,
      '............ff..................',
      E, E, E, E, E, E, E, E,
      E,
      '...........zzzz.................',
      '..@..........................G..',
      F,
      F,
    ],
    traps: [
      { id: 'f1', type: 'fallblock', at: 'f', trigger: { event: 'enter-area', area: 'z', delay: 120 } },
    ],
  },
  {
    id: '1-7', chapter: 1, index: 7, name: 'Nope',
    quip: 'A wall appears! It is very rude.',
    tip: 'It pops up ahead of you. Hop over it.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      '....................w...........',
      '..@.................w........G..',
      F,
      F,
    ],
    traps: [
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'proximity', distance: 85 } },
    ],
  },
  {
    id: '1-8', chapter: 1, index: 8, name: 'Pop Quiz',
    quip: 'Everything you learned. At once.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@.....................d....G..',
      '#######.cc########s#############',
      '#######...######################',
    ],
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 200, tell: 'crack' } },
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 60 }, params: { tell: 'crack' } },
      { id: 'd1', type: 'fakegoal', at: 'd', trigger: { event: 'touch' } },
    ],
  },
];
