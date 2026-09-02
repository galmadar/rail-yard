import { join, polyline, sCurve, straight, type Polyline, type Vec2 } from '../../sim/geometry'
import type { Edge, Yard, YardNode } from '../../sim/yard'
import type { Train } from '../../sim/train'
import type { World, Job } from '../../sim/World'
import { loco, wagon } from '../../sim/vehicles'

/** A circular bend, swept from one angle to another (degrees) about a centre. */
function bend(cx: number, cz: number, r: number, from: number, to: number, samples = 36): Polyline {
  const points: Vec2[] = []
  for (let i = 0; i <= samples; i++) {
    const a = ((from + (to - from) * (i / samples)) * Math.PI) / 180
    points.push({ x: cx + r * Math.cos(a), z: cz + r * Math.sin(a) })
  }
  return polyline(points)
}

/**
 * Halton Loop. The yard road runs west to east through three sets of points and
 * then swings away north on a big loop that comes back in at the west end, so
 * the road bites its own tail. Drive round it and you come back facing the same
 * way but standing at the other end of whatever you left behind.
 *
 * The loop keeps to the north and every siding hangs off to the south, so no
 * two roads are ever drawn over each other.
 */
const LOOP_LINE = join(
  straight({ x: 50, z: 0 }, { x: 80, z: 0 }),
  bend(80, -30, 30, 90, -90),
  straight({ x: 80, z: -60 }, { x: -80, z: -60 }),
  bend(-80, -30, 30, -90, -270),
  straight({ x: -80, z: 0 }, { x: -50, z: 0 }),
)

function buildYard(): Yard {
  const edges: Edge[] = [
    {
      id: 'loop',
      name: 'the loop',
      from: 'point-3',
      to: 'point-1',
      line: LOOP_LINE,
    },
    {
      id: 'yard-west',
      name: 'the yard road',
      from: 'point-1',
      to: 'point-2',
      line: straight({ x: -50, z: 0 }, { x: -10, z: 0 }),
    },
    {
      id: 'yard-east',
      name: 'the yard road',
      from: 'point-2',
      to: 'point-3',
      line: straight({ x: -10, z: 0 }, { x: 50, z: 0 }),
    },
    {
      id: 'far-road',
      name: 'the far road',
      from: 'point-1',
      to: 'buffer-far',
      line: join(
        sCurve({ x: -50, z: 0 }, { x: 8, z: 34 }),
        straight({ x: 8, z: 34 }, { x: 68, z: 34 }),
      ),
    },
    {
      id: 'ore-road',
      name: 'the ore road',
      from: 'point-2',
      to: 'buffer-ore',
      line: join(
        sCurve({ x: -10, z: 0 }, { x: 40, z: 20 }),
        straight({ x: 40, z: 20 }, { x: 85, z: 20 }),
      ),
    },
    {
      id: 'van-road',
      name: 'the van road',
      from: 'point-3',
      to: 'buffer-van',
      line: join(
        sCurve({ x: 50, z: 0 }, { x: 78, z: 11 }),
        straight({ x: 78, z: 11 }, { x: 125, z: 11 }),
      ),
    },
  ]

  // Every set of points is entered from the loop side and left along the yard
  // road, so with all three straight you can drive round and round for ever.
  const nodes: YardNode[] = [
    { kind: 'buffer', id: 'buffer-far', edge: 'far-road' },
    { kind: 'buffer', id: 'buffer-ore', edge: 'ore-road' },
    { kind: 'buffer', id: 'buffer-van', edge: 'van-road' },
    {
      kind: 'switch',
      id: 'point-1',
      label: 'point 1',
      toe: 'loop',
      straight: 'yard-west',
      diverge: 'far-road',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-2',
      label: 'point 2',
      toe: 'yard-west',
      straight: 'yard-east',
      diverge: 'ore-road',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-3',
      label: 'point 3',
      toe: 'yard-east',
      straight: 'loop',
      diverge: 'van-road',
      state: 'straight',
    },
  ]

  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges: new Map(edges.map((e) => [e.id, e])),
    switchOrder: ['point-1', 'point-2', 'point-3'],
    signs: [
      { edge: 'loop', at: 0.5 },
      { edge: 'far-road', at: 0.62 },
      { edge: 'ore-road', at: 0.5 },
      { edge: 'van-road', at: 0.75 },
    ],
    view: { centre: { x: 8, z: -12 }, distance: 230 },
  }
}

const PILOT = loco('pilot', 'the pilot')
const ORE = wagon('ore', 'the ore hopper', '#4d7a44')
const CRATE_VAN = wagon('crate-van', 'the crate van', '#a8443a')
const TIMBER = wagon('timber', 'the timber wagon', '#b8862f')

function standing(id: string, cars: typeof PILOT[], edge: string, head: number): Train {
  return {
    id,
    cars: cars.map((vehicle) => ({ vehicle, reversed: false })),
    path: [{ edge, forward: true }],
    head,
    speed: 0,
  }
}

export const RUNAROUND_JOB: Job = {
  title: 'Round the loop',
  goals: [
    { vehicleId: 'ore', edgeId: 'ore-road', text: 'the ore hopper goes on the ore road' },
    { vehicleId: 'crate-van', edgeId: 'van-road', text: 'the crate van goes on the van road' },
    { vehicleId: 'timber', edgeId: 'far-road', text: 'the timber wagon goes on the far road' },
  ],
}

/**
 * The pilot starts east of the cut, and every siding is entered going east, so
 * it has to shove the wagons - it can never leave one behind while pulling.
 * Getting to their far end means going all the way round the loop.
 */
export function createLoopWorld(): World {
  const yard = buildYard()
  return {
    yard,
    trains: [
      standing('player', [PILOT], 'yard-east', 30),
      standing('cut', [ORE, CRATE_VAN, TIMBER], 'yard-west', 34),
    ],
    job: RUNAROUND_JOB,
    time: 0,
    notice: null,
    cutAt: 1,
    done: false,
  }
}
