import { LevelDef } from './types';
import { rows, full } from './build';

/**
 * Chapter 4 — Chaos Academy.
 * A theatre school where every lesson is a performance and every prop is
 * in on the joke. Mechanics combine; timing and reading the stage matter.
 */
export const CH4: LevelDef[] = [
  {
    // Opening night: two spinning spiked arms sweep the stage floor.
    // Read the rotation, pass while the arm is up. No tricks — yet.
    id: '4-1', chapter: 4, index: 1, name: 'Opening Night',
    quip: 'Break a leg. Not literally.',
    tip: 'Only the arm tips reach the floor. Go right after a tip passes.',
    map: rows(
      '...............o',
      '........................q',
      '',
      '',
      '..@..........................G',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'o1', type: 'spinner', at: 'o', trigger: { event: 'always' }, params: { len: 4, speed: 105 } },
      { id: 'q1', type: 'spinner', at: 'q', trigger: { event: 'always' }, params: { len: 3, speed: 140, dir: -1, phase: 180 } },
    ],
  },
  {
    // The audition: three identical doors on three stages. Two are props.
    // The real one gets stage fright and bolts — right next to a prop.
    id: '4-2', chapter: 4, index: 2, name: 'The Audition',
    quip: 'Three doors audition. One gets the part.',
    tip: 'The real door hides beside a fake one. Approach from the right.',
    map: rows(
      '.................e..t',
      '................######',
      '..........d................G',
      '........#####............#######',
      '',
      '..@',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'd1', type: 'fakegoal', at: 'd', trigger: { event: 'touch' } },
      { id: 'e1', type: 'fakegoal', at: 'e', trigger: { event: 'touch' } },
      { id: 'g1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 90 }, params: { hops: 1 } },
    ],
  },
  {
    // The orchestra pit: a low corridor (no room to jump) over three spike
    // beds that sink in a rolling wave at walking pace, then a piston on the
    // downbeat. Wait for the first bed, then walk with the music.
    id: '4-3', chapter: 4, index: 3, name: 'Conductor',
    quip: 'Rhythm game. With consequences.',
    tip: 'Each bed sinks just after the one before it. Follow the wave.',
    map: rows(
      '..........................####',
      '..........................####',
      '...........................kk',
      '...........................kk',
      '....######################',
      '....######################',
      '',
      '..@........................zz.G.',
      '######sssss##uuuuu##wwwww#######',
      full(),
      full(),
    ),
    traps: [
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'always', delay: 300 }, params: { period: 1600, hold: 700, phase: 0 } },
      { id: 's2', type: 'spikes', at: 'u', trigger: { event: 'always', delay: 300 }, params: { period: 1600, hold: 700, phase: 980 } },
      { id: 's3', type: 'spikes', at: 'w', trigger: { event: 'always', delay: 300 }, params: { period: 1600, hold: 700, phase: 360 } },
      { id: 'k1', type: 'crusher', at: 'k', to: 'z', trigger: { event: 'always', delay: 500 }, params: { speed: 900, cycle: true } },
    ],
  },
  {
    // Setup: an impossible pit and a big friendly button. Press it: a
    // bridge rises! Surprise: the bridge has a short attention span.
    // Discovery: press and GO. Payoff: you sprint a vanishing stage.
    id: '4-4', chapter: 4, index: 4, name: 'The Helpful Bridge',
    quip: 'The bridge is very supportive. For a while.',
    tip: 'Press and sprint — the bridge sinks again after two seconds.',
    map: rows(
      '..@...p.......................G.',
      '########bbbbbbbbbbbbbbbb########',
      '########................########',
      '########................########',
    ),
    traps: [
      { id: 'p1', type: 'plate', at: 'p', trigger: { event: 'touch' } },
      { id: 'b1', type: 'wall', at: 'b', trigger: { event: 'press', ref: 'p1', delay: 80 }, params: { retract: 1450 } },
    ],
  },
  {
    // The academy's fire drill: the floor collapses section by section
    // from behind. Hop the riser, clear the gap, climb out. Don't stop.
    id: '4-5', chapter: 4, index: 5, name: 'Fire Drill',
    quip: 'This is not a drill. It is a floor.',
    tip: 'Never stop: hop the riser, clear the gap, jump for the ledge.',
    map: rows(
      '..............................G.',
      '........................########',
      '..............####......########',
      '..@...........####......########',
      'aaaaaabbbbbbcccccc..dddd########',
      '........................########',
      '........................########',
    ),
    traps: [
      { id: 'a1', type: 'collapse', at: 'a', trigger: { event: 'timer', after: 900 }, params: { delay: 300, tell: 'crack' } },
      { id: 'b1', type: 'collapse', at: 'b', trigger: { event: 'timer', after: 1500 }, params: { delay: 300, tell: 'crack' } },
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'timer', after: 2100 }, params: { delay: 300, tell: 'crack' } },
      { id: 'd1', type: 'collapse', at: 'd', trigger: { event: 'timer', after: 2800 }, params: { delay: 300, tell: 'crack' } },
    ],
  },
  {
    // The circus wing: springs fling you over two pits, and a spinning arm
    // guards each arc. Time the walk-in, enjoy the flight.
    id: '4-6', chapter: 4, index: 6, name: 'Trapeze',
    quip: 'Look ma, no floor.',
    tip: 'Wait for the arm to swing away, then walk onto the spring.',
    map: rows(
      '........o.............u',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '.@..q...........r............G',
      '#####........#####.........#####',
      '#####........#####.........#####',
      '#####........#####.........#####',
    ),
    traps: [
      { id: 'q1', type: 'spring', at: 'q', trigger: { event: 'always' }, params: { speed: 960 } },
      { id: 'r1', type: 'spring', at: 'r', trigger: { event: 'always' }, params: { speed: 960 } },
      { id: 'o1', type: 'spinner', at: 'o', trigger: { event: 'always' }, params: { len: 3, speed: 100 } },
      { id: 'u1', type: 'spinner', at: 'u', trigger: { event: 'always' }, params: { len: 3, speed: 100, dir: -1, phase: 90 } },
    ],
  },
  {
    // Trust fall: a cracked staircase that crumbles a beat after each step,
    // with clean, inviting steps placed exactly where a long jump would land.
    // The clean ones are painted on. The ugly ones hold — briefly.
    id: '4-7', chapter: 4, index: 7, name: 'Trust Fall',
    quip: 'Only the ugly steps are real. Briefly.',
    tip: 'Hop step to step on the cracked ones. The clean steps are paint.',
    map: rows(
      '..........................G',
      '..................dd..##########',
      '......................##########',
      '..............cc..gg..##########',
      '......................##########',
      '..........bb..gg......##########',
      '......................##########',
      '......aa..gg..........##########',
      '..@...................##########',
      '#####.................##########',
      '#####.................##########',
      '#####.................##########',
    ),
    traps: [
      { id: 'a1', type: 'collapse', at: 'a', trigger: { event: 'touch' }, params: { fuse: 200, delay: 320, tell: 'crack' } },
      { id: 'b1', type: 'collapse', at: 'b', trigger: { event: 'touch' }, params: { fuse: 200, delay: 320, tell: 'crack' } },
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { fuse: 200, delay: 320, tell: 'crack' } },
      { id: 'd1', type: 'collapse', at: 'd', trigger: { event: 'touch' }, params: { fuse: 200, delay: 320, tell: 'crack' } },
      { id: 'g1', type: 'ghost', at: 'g', trigger: { event: 'always' } },
    ],
  },
  {
    // Final exam: a belt feeds you under a spinning arm, a cracked bridge
    // tests your feet, a spring tests your nerve, and the door tests your
    // patience one last time.
    id: '4-8', chapter: 4, index: 8, name: 'Final Exam I',
    quip: 'Chapter four sends its regards.',
    tip: 'Belt, arm, bridge, spring. The door gives up after one hop.',
    map: rows(
      '.......................t.....G',
      '......................##########',
      '......................##########',
      '.......o..............##########',
      '......................##########',
      '......................##########',
      '..@..............q....##########',
      '###vvvvvvvccccc####...##########',
      '##########.....####...##########',
      '##########.....####...##########',
    ),
    traps: [
      { id: 'v1', type: 'conveyor', at: 'v', trigger: { event: 'always' }, params: { dir: 1, speed: 80 } },
      { id: 'o1', type: 'spinner', at: 'o', trigger: { event: 'always' }, params: { len: 3, speed: 110 } },
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 220, tell: 'crack' } },
      { id: 'q1', type: 'spring', at: 'q', trigger: { event: 'always' }, params: { speed: 980 } },
      { id: 'g1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 90 }, params: { hops: 1 } },
    ],
  },
];
