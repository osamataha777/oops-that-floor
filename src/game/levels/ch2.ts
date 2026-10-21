import { LevelDef } from './types';

const E = '................................';
const F = '################################';

/** Chapter 2 — Everything Moves. */
export const CH2: LevelDef[] = [
  {
    id: '2-1', chapter: 2, index: 1, name: 'Moving Day',
    quip: 'That platform has somewhere to be.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      '..........mm........nn..........',
      '..@.........................G...',
      '########..................######',
      '########..................######',
    ],
    traps: [
      { id: 'm1', type: 'mover', at: 'm', to: 'n', trigger: { event: 'touch' }, params: { speed: 100 } },
    ],
  },
  {
    id: '2-2', chapter: 2, index: 2, name: 'Belt Sander',
    quip: 'The floor is in a hurry. Toward spikes.',
    tip: 'Fight the belt or bunny-hop it.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@.....................XX..G...',
      '##############vvvvvv############',
      F,
    ],
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: 1, speed: 60 } },
    ],
  },
  {
    id: '2-3', chapter: 2, index: 3, name: 'Blink Steps',
    quip: 'They get shy when you stand on them.',
    tip: 'Keep moving. They come back — eventually.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      '........t...t...t...t...........',
      '..@........................G....',
      '########................########',
      '########................########',
    ],
    traps: [
      { id: 't1', type: 'timed', at: 't', trigger: { event: 'touch' }, params: { fuse: 800, off: 1300, cycle: true } },
    ],
  },
  {
    id: '2-4', chapter: 2, index: 4, name: 'The Crusher',
    quip: 'It has been waiting up there for years.',
    tip: 'Bait the slam, then walk under during the slow rise.',
    map: [
      E, E, E, E, E,
      '..............kk................',
      E, E, E, E, E, E, E, E,
      E,
      '..@...........zzzz...........G..',
      F,
      F,
    ],
    traps: [
      { id: 'k1', type: 'crusher', at: 'k', to: 'z', trigger: { event: 'enter-area', area: 'z', delay: 180 }, params: { speed: 950 } },
    ],
  },
  {
    id: '2-5', chapter: 2, index: 5, name: 'Chain Reaction',
    quip: 'The button is doing its best.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      '..........mm.......nn...........',
      '..@.....p....................G..',
      '##########............##########',
      '##########............##########',
    ],
    traps: [
      { id: 'p1', type: 'plate', at: 'p', trigger: { event: 'touch' } },
      { id: 'm1', type: 'mover', at: 'm', to: 'n', trigger: { event: 'press', ref: 'p1' }, params: { speed: 120, cycle: true } },
    ],
  },
  {
    id: '2-6', chapter: 2, index: 6, name: 'Skyfall',
    quip: 'Three of them. All very loyal.',
    tip: 'Each one falls when you walk under it. Never stop.',
    map: [
      E, E, E, E,
      '..........ff....hh....jj........',
      E, E, E, E, E, E, E, E,
      E,
      E,
      '..@......zzzz..yyyy..xxxx....G..',
      F,
      F,
    ],
    traps: [
      { id: 'f1', type: 'fallblock', at: 'f', trigger: { event: 'enter-area', area: 'z', delay: 220 } },
      { id: 'f2', type: 'fallblock', at: 'h', trigger: { event: 'enter-area', area: 'y', delay: 120 } },
      { id: 'f3', type: 'fallblock', at: 'j', trigger: { event: 'enter-area', area: 'x', delay: 0 } },
    ],
  },
  {
    id: '2-7', chapter: 2, index: 7, name: 'Heartbeat',
    quip: 'The floor breathes. In spikes.',
    tip: 'Watch the rhythm: left, middle, right.',
    map: [
      E, E, E, E, E, E, E, E, E, E, E, E, E, E,
      E,
      '..@..........................G..',
      '##########ssss..uuuu..wwww######',
      F,
    ],
    traps: [
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'always', delay: 400 }, params: { period: 1700, hold: 750, phase: 0 } },
      { id: 's2', type: 'spikes', at: 'u', trigger: { event: 'always', delay: 400 }, params: { period: 1700, hold: 750, phase: 560 } },
      { id: 's3', type: 'spikes', at: 'w', trigger: { event: 'always', delay: 400 }, params: { period: 1700, hold: 750, phase: 1120 } },
    ],
  },
  {
    id: '2-8', chapter: 2, index: 8, name: 'Muscle Memory',
    quip: 'Chapter one wanted a rematch.',
    map: [
      E, E, E, E,
      '........................f.......',
      E, E, E, E, E, E, E, E,
      E,
      '.............mm....nn...........',
      '..@....................zzzz..G..',
      '########vvvv..........##########',
      '############..........##########',
    ],
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: 1, speed: 65 } },
      { id: 'm1', type: 'mover', at: 'm', to: 'n', trigger: { event: 'always', delay: 300 }, params: { speed: 120, cycle: true } },
      { id: 'f1', type: 'fallblock', at: 'f', trigger: { event: 'enter-area', area: 'z', delay: 140 } },
    ],
  },
];
