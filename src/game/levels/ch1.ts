import { LevelDef } from './types';
import { rows, full } from './build';

/**
 * Chapter 1 — Trust Nothing.
 * The meadow is warm and honest-looking. Each level is one short comedy
 * scene: Setup → Expectation → Surprise → Discovery → Recovery → Payoff.
 * The first betrayal is harmless; lethal ones only arrive once the player
 * has learned that the floor has opinions.
 */
export const CH1: LevelDef[] = [
  {
    // Setup: a sunny stroll up two little steps to the door.
    // Surprise: the path sags under you — into a shallow dip, not a death.
    // Payoff: "the floor lies" learned for free; hop out and carry on.
    id: '1-1', chapter: 1, index: 1, name: 'Just Walk',
    quip: 'Just walk to the door. Promise.',
    tip: 'That dip is harmless. Hop out!',
    map: rows(
      '...........................G',
      '.....................###########',
      '..@.............################',
      '##########ccccc#################',
      full(),
      full(),
    ),
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 200, tell: 'none' } },
    ],
  },
  {
    // Setup: a cute three-tile gap. Expectation: hop it.
    // Surprise: the cracked landing crumbles the moment you touch it.
    // Recovery: jump farther, or bounce straight off the cracks.
    id: '1-2', chapter: 1, index: 2, name: 'Mind the Gap',
    quip: 'Cracks are just character. Right?',
    tip: 'Cracked floor drops fast. Clear it — or hop straight off it.',
    map: rows(
      '..@.........................G',
      '############...ccccc############',
      '############........############',
      '############........############',
    ),
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 90, tell: 'crack' } },
    ],
  },
  {
    // Setup: low road, high road. The low road is shorter and obviously
    // fine. Surprise: the floor grows teeth as you near.
    // Recovery: jump from further back — or take the planks. Your call.
    id: '1-3', chapter: 1, index: 3, name: 'Now It Bites',
    quip: 'Lesson two: teeth.',
    tip: 'Teeth pop when you get close. Jump from further back — or take the high road.',
    map: rows(
      '..........====.......====',
      '',
      '',
      '..@...........................G.',
      '#############ssss###############',
      full(),
      full(),
    ),
    traps: [
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 74 } },
    ],
  },
  {
    // The early signature moment. The door is right there… and it panics.
    // It scampers up behind you to a high plank, then back down to the
    // middle, before running out of courage. Pure slapstick, zero risk.
    id: '1-4', chapter: 1, index: 4, name: 'Cold Feet',
    quip: 'It is shy. Be gentle.',
    tip: 'It can only run twice. Keep after it.',
    map: rows(
      '.....t',
      '....====',
      '',
      '',
      '.........====...............G',
      '......................##########',
      '..@.............t.....##########',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'g1', type: 'shygoal', at: 'G', to: 't', trigger: { event: 'proximity', distance: 100 }, params: { hops: 2 } },
    ],
  },
  {
    // Setup: a sturdy bridge over a pit, with some planks above for the
    // fussy. Surprise: the middle of the bridge was only ever painted on.
    // Recovery: leap the painted stretch, or take the planks.
    id: '1-5', chapter: 1, index: 5, name: 'The Nice Path',
    quip: 'The floor feels… hollow.',
    tip: 'Some floor is only painted on. Leap the middle, or take the planks.',
    map: rows(
      '...........====....====',
      '',
      '',
      '..@...........................G.',
      '#############~~~~~##############',
      '#########...........############',
      '#########...........############',
    ),
    traps: [],
  },
  {
    // Setup: the door sits on a ledge just too tall to jump.
    // Surprise: blocks drop from the sky — the second one right where you
    // get stuck against the ledge. Discovery: wait for it to land…
    // Payoff: danger becomes stairs.
    id: '1-6', chapter: 1, index: 6, name: 'Watch Your Head',
    quip: 'Gravity has a sense of humor.',
    tip: 'Let the second block land first — then climb it.',
    map: rows(
      '..........f.............h',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '.............................G',
      '.........................#######',
      '.........................#######',
      '..@......................#######',
      '.........zz.........yy...#######',
      full(),
      full(),
    ),
    traps: [
      { id: 'f1', type: 'fallblock', at: 'f', trigger: { event: 'enter-area', area: 'z' } },
      { id: 'f2', type: 'fallblock', at: 'h', trigger: { event: 'enter-area', area: 'y' } },
    ],
  },
  {
    // Setup: a clear run to the door. A wall pops up — rude, but hoppable.
    // Surprise: a second, much taller wall slams up at the door. "Nope."
    // Discovery: it can't keep this up. Wait… and it changes its mind.
    id: '1-7', chapter: 1, index: 7, name: 'Nope',
    quip: 'A wall appears! It is very rude.',
    tip: 'Hop the small wall. The big one gets bored — wait for it.',
    map: rows(
      '........................v',
      '........................v',
      '............w...........v',
      '..@.........w...........v.....G.',
      full(),
      full(),
      full(),
    ),
    traps: [
      { id: 'w1', type: 'wall', at: 'w', trigger: { event: 'proximity', distance: 92 } },
      { id: 'w2', type: 'wall', at: 'v', trigger: { event: 'proximity', distance: 110 }, params: { retract: 1300 } },
    ],
  },
  {
    // Pop quiz: crumbling bridge → teeth on the steps → painted gap →
    // a door that is very obviously a door. (It is not.) Everything
    // chapter one taught, in one short run.
    id: '1-8', chapter: 1, index: 8, name: 'Pop Quiz',
    quip: 'Everything you learned. At once.',
    tip: 'Fast feet on the bridge, jump the teeth early, leap the painted gap.',
    map: rows(
      '..........................d...G.',
      '................###s##~~########',
      '..@.............######..########',
      '######cccccc##########..########',
      '######......##########..########',
      '######......##########..########',
    ),
    traps: [
      { id: 'c1', type: 'collapse', at: 'c', trigger: { event: 'touch' }, params: { delay: 300, tell: 'crack' } },
      { id: 's1', type: 'spikes', at: 's', trigger: { event: 'proximity', distance: 64 } },
      { id: 'd1', type: 'fakegoal', at: 'd', trigger: { event: 'touch' } },
    ],
  },
];
