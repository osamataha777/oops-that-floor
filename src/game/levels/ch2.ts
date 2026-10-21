import { LevelDef } from './types';
import { rows, full } from './build';

/**
 * Chapter 2 — Everything Moves.
 * A cheerful workshop. The machines are honest at first; then they develop
 * rhythm, opinions and, eventually, a sense of humour.
 */
export const CH2: LevelDef[] = [
  {
    // Setup: a pit and a little cart. Expectation: hop on, hold right.
    // Surprise: holding right walks you straight off the far end.
    // Discovery: ride it, then jump. It comes back if you miss.
    id: '2-1', chapter: 2, index: 1, name: 'Moving Day',
    quip: 'That platform has somewhere to be.',
    tip: 'Stand still and ride. Jump when it stops.',
    map: rows(
      '..@.......................G',
      '######mm........nn....##########',
      '######................##########',
      '######................##########',
    ),
    traps: [
      { id: 'm1', type: 'mover', at: 'm', to: 'n', trigger: { event: 'touch' }, params: { speed: 130, cycle: true, hold: 700 } },
    ],
  },
  {
    // Setup: the first belt fights you; the second one helps — a lot.
    // Surprise: "helps" means it flings you past the door ledge into teeth.
    // Recovery: jump from the plain block, or walk against the fast belt.
    id: '2-2', chapter: 2, index: 2, name: 'Belt Sander',
    quip: 'The floor is in a hurry. Toward spikes.',
    tip: 'Jump for the ledge from the still block — the fast belt overshoots.',
    map: rows(
      '.......................G',
      '......................####',
      '',
      '..@.........................XXXX',
      '#########vvvvvvvvv##uuuuuuuu####',
      full(),
      full(),
    ),
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: -1, speed: 110 } },
      { id: 'u1', type: 'conveyor', at: 'u', trigger: { event: 'always' }, params: { dir: 1, speed: 170 } },
    ],
  },
  {
    // A staircase over nothing. Each step blinks out a beat after you land,
    // flickering faster as it goes. Keep climbing — they come back.
    id: '2-3', chapter: 2, index: 3, name: 'Blink Steps',
    quip: 'They get shy when you stand on them.',
    tip: 'Don’t stop on a step. They come back if you fall short.',
    map: rows(
      '..............................G.',
      '............................####',
      '.......................ttt..####',
      '..................tttt......####',
      '............tttt............####',
      '..@...tttt..................####',
      '####........................####',
      '####........................####',
      '####........................####',
    ),
    traps: [
      { id: 't1', type: 'timed', at: 't', trigger: { event: 'touch' }, params: { fuse: 700, off: 1400, cycle: true } },
    ],
  },
  {
    // Setup: a low workshop tunnel with two pistons. The first one waits
    // for you and slams when you run in. Discovery: bait it, back off, and
    // slip under on the slow rise. The second keeps a steady beat.
    id: '2-4', chapter: 2, index: 4, name: 'The Crusher',
    quip: 'It has been waiting up there for years.',
    tip: 'Step in, step back, then go while it rises. Count the second one.',
    map: rows(
      '........#################',
      '........#################',
      '............kk.....jj',
      '............kk.....jj',
      '',
      '..@......aa.zz.....yy.......G',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'k1', type: 'crusher', at: 'k', to: 'z', trigger: { event: 'enter-area', area: 'a', delay: 240 }, params: { speed: 950 } },
      { id: 'j1', type: 'crusher', at: 'j', to: 'y', trigger: { event: 'always', delay: 600 }, params: { speed: 900, cycle: true } },
    ],
  },
  {
    // Setup: a locked door and a big friendly button in front of it.
    // Surprise: the button drops a crate — on whoever is standing on it.
    // Payoff: the crate lands on the button, and THAT opens the door.
    id: '2-5', chapter: 2, index: 5, name: 'Chain Reaction',
    quip: 'The button is doing its best.',
    tip: 'Press it and step back. Let the crate finish the job.',
    map: rows(
      '....................f',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '.....................w',
      '.....................w',
      '.....................w',
      '..@.................pw.....G',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'p1', type: 'plate', at: 'p', trigger: { event: 'touch' } },
      { id: 'f1', type: 'fallblock', at: 'f', trigger: { event: 'press', ref: 'p1', delay: 220 } },
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'trap-complete', ref: 'f1', delay: 120 }, params: { dir: -1 } },
    ],
  },
  {
    // Springs! The first one flings you over the wall — straight into a
    // spiked ceiling if you hit it at full tilt. Discovery: you can steer in
    // the air. The second spring is honest and lands you at the door.
    id: '2-6', chapter: 2, index: 6, name: 'Bounce House',
    quip: 'Everything is fun until the ceiling.',
    tip: 'Steer in mid-air: ease off right after the first spring.',
    map: rows(
      '..........####',
      '..........####',
      '..........XXXX',
      '',
      '............................G',
      '........##..............########',
      '........##..............########',
      '........##..............########',
      '........##..............########',
      '........##..............########',
      '..@..q..##..........r...########',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'q1', type: 'spring', at: 'q', trigger: { event: 'always' }, params: { speed: 980 } },
      { id: 'r1', type: 'spring', at: 'r', trigger: { event: 'always' }, params: { speed: 980 } },
    ],
  },
  {
    // A heartbeat staircase. Each landing grows teeth on its own beat —
    // the tips peek out a moment before they bite. Read the rhythm, wait on
    // the safe edges, climb on the off-beat.
    id: '2-7', chapter: 2, index: 7, name: 'Heartbeat',
    quip: 'The floor breathes. In spikes.',
    tip: 'Wait on the plain edge tiles. Move when the teeth sink.',
    map: rows(
      '..............................G.',
      '.............................###',
      '.............................###',
      '......................##www#####',
      '......................##########',
      '...............##uuu############',
      '...............#################',
      '........##sss###################',
      '..@.....########################',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'always', delay: 400 }, params: { period: 1800, hold: 650, phase: 0 } },
      { id: 's2', type: 'spikes', at: 'u', trigger: { event: 'always', delay: 400 }, params: { period: 1800, hold: 650, phase: 600 } },
      { id: 's3', type: 'spikes', at: 'w', trigger: { event: 'always', delay: 400 }, params: { period: 1800, hold: 650, phase: 1200 } },
    ],
  },
  {
    // The assembly line: a belt feeds you under a piston, a lift carries you
    // up, and blink steps race you to the door. Everything has a rhythm.
    id: '2-8', chapter: 2, index: 8, name: 'Assembly Line',
    quip: 'You are the product.',
    tip: 'Let the belt bring you to the piston’s beat. Ride the lift up.',
    map: rows(
      '........####',
      '........####',
      '.........kk...................G.',
      '.........kk.nn..###..tt..tt.####',
      '................###.........####',
      '................###.........####',
      '................###.........####',
      '.@.......zz.....###.........####',
      '####vvvvvvvvmm..###.........####',
      '############....###.........####',
      '############....###.........####',
    ),
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: 1, speed: 100 } },
      { id: 'k1', type: 'crusher', at: 'k', to: 'z', trigger: { event: 'always', delay: 500 }, params: { speed: 900, cycle: true } },
      { id: 'm1', type: 'mover', at: 'm', to: 'n', trigger: { event: 'touch', delay: 150 }, params: { speed: 95, cycle: true, hold: 600 } },
      { id: 't1', type: 'timed', at: 't', trigger: { event: 'touch' }, params: { fuse: 650, off: 1300, cycle: true } },
    ],
  },
];
