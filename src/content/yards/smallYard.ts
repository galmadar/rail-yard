import { join, sCurve, straight } from '../../sim/geometry'
import type { Edge, Yard, YardNode } from '../../sim/yard'
import type { Train } from '../../sim/train'
import type { World, Job } from '../../sim/World'
import { loco, wagon } from '../../sim/vehicles'

/**
 * Marsden Yard. A headshunt at the west end, three sidings fanning south-east
 * behind three sets of points. Everything is worked from the headshunt: set the
 * road, drive east into a siding, set back west to come out again.
 *
 * The deepest siding hangs off the westmost points so the roads never cross.
 */
function buildYard(): Yard {
  const edges: Edge[] = [
    {
      id: 'headshunt',
      name: 'the headshunt',
      from: 'buffer-west',
      to: 'point-1',
      line: straight({ x: -95, z: 0 }, { x: -30, z: 0 }),
    },
    {
      id: 'main-1',
      name: 'the yard neck',
      from: 'point-1',
      to: 'point-2',
      line: straight({ x: -30, z: 0 }, { x: -10, z: 0 }),
    },
    {
      id: 'main-2',
      name: 'the yard neck',
      from: 'point-2',
      to: 'point-3',
      line: straight({ x: -10, z: 0 }, { x: 10, z: 0 }),
    },
    {
      id: 'spare',
      name: 'the spare road',
      from: 'point-3',
      to: 'buffer-east',
      line: straight({ x: 10, z: 0 }, { x: 95, z: 0 }),
    },
    {
      id: 'goods-road',
      name: 'the goods road',
      from: 'point-1',
      to: 'buffer-goods',
      line: join(
        sCurve({ x: -30, z: 0 }, { x: 20, z: -36 }),
        straight({ x: 20, z: -36 }, { x: 75, z: -36 }),
      ),
    },
    {
      id: 'oil-road',
      name: 'the oil road',
      from: 'point-2',
      to: 'buffer-oil',
      line: join(
        sCurve({ x: -10, z: 0 }, { x: 35, z: -24 }),
        straight({ x: 35, z: -24 }, { x: 80, z: -24 }),
      ),
    },
    {
      id: 'coal-road',
      name: 'the coal road',
      from: 'point-3',
      to: 'buffer-coal',
      line: join(
        sCurve({ x: 10, z: 0 }, { x: 50, z: -12 }),
        straight({ x: 50, z: -12 }, { x: 85, z: -12 }),
      ),
    },
  ]

  const nodes: YardNode[] = [
    { kind: 'buffer', id: 'buffer-west', edge: 'headshunt' },
    { kind: 'buffer', id: 'buffer-east', edge: 'spare' },
    { kind: 'buffer', id: 'buffer-goods', edge: 'goods-road' },
    { kind: 'buffer', id: 'buffer-oil', edge: 'oil-road' },
    { kind: 'buffer', id: 'buffer-coal', edge: 'coal-road' },
    {
      kind: 'switch',
      id: 'point-1',
      label: 'point 1',
      toe: 'headshunt',
      straight: 'main-1',
      diverge: 'goods-road',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-2',
      label: 'point 2',
      toe: 'main-1',
      straight: 'main-2',
      diverge: 'oil-road',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-3',
      label: 'point 3',
      toe: 'main-2',
      straight: 'spare',
      diverge: 'coal-road',
      state: 'straight',
    },
  ]

  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges: new Map(edges.map((e) => [e.id, e])),
    switchOrder: ['point-1', 'point-2', 'point-3'],
    signs: [
      { edge: 'headshunt', at: 0.35 },
      { edge: 'spare', at: 0.45 },
      { edge: 'goods-road', at: 0.62 },
      { edge: 'oil-road', at: 0.62 },
      { edge: 'coal-road', at: 0.62 },
    ],
  }
}

const SHUNTER = loco('shunter', 'the shunter')
const TANKER = wagon('tanker', 'the tanker', '#3f7fb8')
const HOPPER = wagon('hopper', 'the coal hopper', '#4d7a44')
const VAN = wagon('van', 'the box van', '#a8443a')

function standing(id: string, cars: typeof SHUNTER[], edge: string, head: number): Train {
  return {
    id,
    cars: cars.map((vehicle) => ({ vehicle, reversed: false })),
    path: [{ edge, forward: true }],
    head,
    speed: 0,
  }
}

export const SORTING_JOB: Job = {
  title: 'Sort the yard',
  goals: [
    { vehicleId: 'van', edgeId: 'goods-road', text: 'the box van goes on the goods road' },
    { vehicleId: 'tanker', edgeId: 'oil-road', text: 'the tanker goes on the oil road' },
    { vehicleId: 'hopper', edgeId: 'coal-road', text: 'the coal hopper goes on the coal road' },
  ],
}

export function createWorld(): World {
  const yard = buildYard()
  return {
    yard,
    trains: [
      standing('player', [SHUNTER], 'headshunt', 55),
      standing('cut-tanker', [TANKER], 'goods-road', 95),
      standing('cut-hopper', [HOPPER], 'oil-road', 85),
      standing('cut-van', [VAN], 'spare', 34),
    ],
    job: SORTING_JOB,
    time: 0,
    notice: null,
    cutAt: 1,
    done: false,
  }
}
