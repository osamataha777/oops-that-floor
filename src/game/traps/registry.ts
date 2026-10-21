import { Trap } from './TrapBase';
import { TrapDef, TrapType } from '../levels/types';
import { TrapContext } from './context';
import { CollapseTrap, GhostTrap, TimedTrap } from './impl/floors';
import { HiddenSpikesTrap, FallBlockTrap, WallTrap, CrusherTrap } from './impl/hazards';
import { MoverTrap, ConveyorTrap } from './impl/platforms';
import { FakeGoalTrap, ShyGoalTrap } from './impl/goals';
import { PlateTrap, GravFlipTrap, SpinnerTrap } from './impl/mechanisms';

const REGISTRY: Record<TrapType, new (def: TrapDef, ctx: TrapContext) => Trap> = {
  collapse: CollapseTrap,
  spikes: HiddenSpikesTrap,
  fallblock: FallBlockTrap,
  wall: WallTrap,
  mover: MoverTrap,
  fakegoal: FakeGoalTrap,
  shygoal: ShyGoalTrap,
  spinner: SpinnerTrap,
  conveyor: ConveyorTrap,
  gravflip: GravFlipTrap,
  plate: PlateTrap,
  timed: TimedTrap,
  ghost: GhostTrap,
  crusher: CrusherTrap,
};

export function buildTrap(def: TrapDef, ctx: TrapContext): Trap {
  const Ctor = REGISTRY[def.type];
  if (!Ctor) throw new Error(`unknown trap type '${def.type}'`);
  return new Ctor(def, ctx);
}
