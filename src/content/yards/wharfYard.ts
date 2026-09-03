import { join, sCurve, straight } from '../../sim/geometry'
import type { Edge, Yard, YardNode } from '../../sim/yard'
import type { World } from '../../sim/World'
import { RIDLEY_JOBS } from '../jobs/ridley'

/**
 * Ridley Wharf. The yard runs west to east past two sidings and out onto the
 * quay road. Point 3, at the far end of the yard road, is the odd one: it faces
 * the wrong way, so the back road can only be entered by running out onto the
 * quay first and setting back. Point 4 does the same trick again, and that
 * second change of direction is what puts the wagon on the far side of the
 * shunter, so it can be left there - nothing reaches the crane any other way.
 *
 * So a crane road wagon is handled twice, and the quay has to be empty before
 * you can start. The back road holds the shunter and two wagons, no more.
 *
 * Everything south of the yard road fans out from the westmost points first, so
 * no two roads are ever drawn over each other; the back and crane roads keep to
 * the north on their own.
 */
function buildYard(): Yard {
  const edges: Edge[] = [
    {
      id: 'headshunt',
      name: 'the headshunt',
      from: 'buffer-west',
      to: 'point-1',
      line: straight({ x: -98, z: 0 }, { x: -56, z: 0 }),
    },
    {
      id: 'neck',
      name: 'the yard neck',
      from: 'point-1',
      to: 'point-2',
      line: straight({ x: -56, z: 0 }, { x: -24, z: 0 }),
    },
    {
      id: 'yard-road',
      name: 'the yard road',
      from: 'point-2',
      to: 'point-3',
      line: straight({ x: -24, z: 0 }, { x: 28, z: 0 }),
    },
    {
      id: 'quay',
      name: 'the quay road',
      from: 'point-3',
      to: 'buffer-quay',
      line: straight({ x: 28, z: 0 }, { x: 72, z: 0 }),
    },
    {
      id: 'stone-road',
      name: 'the stone road',
      from: 'point-1',
      to: 'buffer-stone',
      line: join(
        sCurve({ x: -56, z: 0 }, { x: -6, z: -34 }),
        straight({ x: -6, z: -34 }, { x: 56, z: -34 }),
      ),
    },
    {
      id: 'timber-road',
      name: 'the timber road',
      from: 'point-2',
      to: 'buffer-timber',
      line: join(
        sCurve({ x: -24, z: 0 }, { x: 14, z: -22 }),
        straight({ x: 14, z: -22 }, { x: 66, z: -22 }),
      ),
    },
    {
      id: 'back-road-east',
      name: 'the back road',
      from: 'point-3',
      to: 'point-4',
      line: join(
        sCurve({ x: 28, z: 0 }, { x: 0, z: 22 }),
        straight({ x: 0, z: 22 }, { x: -16, z: 22 }),
      ),
    },
    {
      // Thirty metres: the shunter and two wagons, and that is the lot.
      id: 'back-road-west',
      name: 'the back road',
      from: 'point-4',
      to: 'buffer-back',
      line: straight({ x: -16, z: 22 }, { x: -46, z: 22 }),
    },
    {
      id: 'crane-road',
      name: 'the crane road',
      from: 'point-4',
      to: 'buffer-crane',
      line: join(
        sCurve({ x: -16, z: 22 }, { x: 20, z: 38 }),
        straight({ x: 20, z: 38 }, { x: 74, z: 38 }),
      ),
    },
  ]

  // Points 1 and 2 face west, the way a siding normally does. Points 3 and 4
  // face the other way, which is the whole of this yard.
  const nodes: YardNode[] = [
    { kind: 'buffer', id: 'buffer-west', edge: 'headshunt' },
    { kind: 'buffer', id: 'buffer-quay', edge: 'quay' },
    { kind: 'buffer', id: 'buffer-stone', edge: 'stone-road' },
    { kind: 'buffer', id: 'buffer-timber', edge: 'timber-road' },
    { kind: 'buffer', id: 'buffer-back', edge: 'back-road-west' },
    { kind: 'buffer', id: 'buffer-crane', edge: 'crane-road' },
    {
      kind: 'switch',
      id: 'point-1',
      label: 'point 1',
      toe: 'headshunt',
      straight: 'neck',
      diverge: 'stone-road',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-2',
      label: 'point 2',
      toe: 'neck',
      straight: 'yard-road',
      diverge: 'timber-road',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-3',
      label: 'point 3',
      toe: 'quay',
      straight: 'yard-road',
      diverge: 'back-road-east',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-4',
      label: 'point 4',
      toe: 'back-road-west',
      straight: 'back-road-east',
      diverge: 'crane-road',
      state: 'straight',
    },
  ]

  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges: new Map(edges.map((e) => [e.id, e])),
    switchOrder: ['point-1', 'point-2', 'point-3', 'point-4'],
    view: { centre: { x: -10, z: 5 }, distance: 150 },
    signs: [
      { edge: 'headshunt', at: 0.4 },
      { edge: 'yard-road', at: 0.5 },
      { edge: 'quay', at: 0.5 },
      { edge: 'stone-road', at: 0.66 },
      { edge: 'timber-road', at: 0.62 },
      // Named out on its own stub, clear of the yard road's board.
      { edge: 'back-road-west', at: 0.5 },
      { edge: 'crane-road', at: 0.75 },
    ],
  }
}

export function createWharfWorld(jobIndex = 0): World {
  const setup = RIDLEY_JOBS[Math.max(0, Math.min(RIDLEY_JOBS.length - 1, jobIndex))]
  return {
    yard: buildYard(),
    trains: setup.layout(),
    job: setup.job,
    jobIndex: RIDLEY_JOBS.indexOf(setup),
    jobCount: RIDLEY_JOBS.length,
    time: 0,
    notice: null,
    cutAt: 1,
    done: false,
  }
}
