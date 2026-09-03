import { join, polyline, sCurve, straight, type Polyline, type Vec2 } from '../../sim/geometry'
import type { Edge, Yard, YardNode } from '../../sim/yard'
import type { World } from '../../sim/World'
import { CALDER_JOBS } from '../jobs/calder'

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
 * Calder Triangle. The main line runs west to east along the bottom, and two
 * curves swing up off its ends to meet at the top, where one short road carries
 * on to a buffer stop. Drive up one curve, set back down the other, and the
 * whole train comes out the other way round - the shunter that was pulling is
 * now pushing, and the wagon that was leading is now on the tail.
 *
 * That is the only thing here. The sand road faces east, so a wagon can only be
 * left down it by a train that has been turned; the mill road faces west, so it
 * wants a train that has not. Some days you go round twice.
 *
 * The triangle keeps to the north of the main line and both sidings keep to the
 * south, so no two roads are ever drawn over each other.
 */
function buildYard(): Yard {
  const edges: Edge[] = [
    {
      id: 'headshunt',
      name: 'the headshunt',
      from: 'buffer-west',
      to: 'point-1',
      line: straight({ x: -124, z: 0 }, { x: -88, z: 0 }),
    },
    {
      id: 'west-road',
      name: 'the yard road',
      from: 'point-1',
      to: 'point-2',
      line: straight({ x: -88, z: 0 }, { x: -30, z: 0 }),
    },
    {
      id: 'base-west',
      name: 'the middle road',
      from: 'point-2',
      to: 'point-3',
      line: straight({ x: -30, z: 0 }, { x: -2, z: 0 }),
    },
    {
      id: 'base-east',
      name: 'the middle road',
      from: 'point-3',
      to: 'point-4',
      line: straight({ x: -2, z: 0 }, { x: 30, z: 0 }),
    },
    {
      id: 'east-road',
      name: 'the east road',
      from: 'point-4',
      to: 'buffer-east',
      line: straight({ x: 30, z: 0 }, { x: 88, z: 0 }),
    },
    {
      // Leaves the main line pointing east and arrives at the top pointing north.
      id: 'west-curve',
      name: 'the west curve',
      from: 'point-2',
      to: 'point-5',
      line: bend(-30, 30, 30, -90, 0),
    },
    {
      // The mirror of it: leaves pointing west, arrives at the top pointing north.
      id: 'east-curve',
      name: 'the east curve',
      from: 'point-4',
      to: 'point-5',
      line: bend(30, 30, 30, -90, -180),
    },
    {
      id: 'turning-road',
      name: 'the turning road',
      from: 'point-5',
      to: 'buffer-top',
      line: straight({ x: 0, z: 30 }, { x: 0, z: 74 }),
    },
    {
      id: 'mill-road',
      name: 'the mill road',
      from: 'point-1',
      to: 'buffer-mill',
      line: join(
        sCurve({ x: -88, z: 0 }, { x: -48, z: -28 }),
        straight({ x: -48, z: -28 }, { x: 24, z: -28 }),
      ),
    },
    {
      // The odd one: it trails back west, so only a train coming from the east
      // can run into it.
      id: 'sand-road',
      name: 'the sand road',
      from: 'point-3',
      to: 'buffer-sand',
      line: join(
        sCurve({ x: -2, z: 0 }, { x: -26, z: -14 }),
        straight({ x: -26, z: -14 }, { x: -52, z: -14 }),
      ),
    },
  ]

  const nodes: YardNode[] = [
    { kind: 'buffer', id: 'buffer-west', edge: 'headshunt' },
    { kind: 'buffer', id: 'buffer-east', edge: 'east-road' },
    { kind: 'buffer', id: 'buffer-top', edge: 'turning-road' },
    { kind: 'buffer', id: 'buffer-mill', edge: 'mill-road' },
    { kind: 'buffer', id: 'buffer-sand', edge: 'sand-road' },
    {
      kind: 'switch',
      id: 'point-1',
      label: 'point 1',
      toe: 'headshunt',
      straight: 'west-road',
      diverge: 'mill-road',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-2',
      label: 'point 2',
      toe: 'west-road',
      straight: 'base-west',
      diverge: 'west-curve',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-3',
      label: 'point 3',
      toe: 'base-east',
      straight: 'base-west',
      diverge: 'sand-road',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-4',
      label: 'point 4',
      toe: 'east-road',
      straight: 'base-east',
      diverge: 'east-curve',
      state: 'straight',
    },
    {
      kind: 'switch',
      id: 'point-5',
      label: 'point 5',
      toe: 'turning-road',
      straight: 'west-curve',
      diverge: 'east-curve',
      state: 'straight',
    },
  ]

  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges: new Map(edges.map((e) => [e.id, e])),
    switchOrder: ['point-1', 'point-2', 'point-3', 'point-4', 'point-5'],
    view: { centre: { x: -18, z: 22 }, distance: 152 },
    signs: [
      { edge: 'headshunt', at: 0.45 },
      { edge: 'west-road', at: 0.45 },
      { edge: 'base-east', at: 0.5 },
      { edge: 'east-road', at: 0.15 },
      { edge: 'west-curve', at: 0.4 },
      { edge: 'east-curve', at: 0.4 },
      { edge: 'turning-road', at: 0.55 },
      { edge: 'mill-road', at: 0.8 },
      { edge: 'sand-road', at: 0.75 },
    ],
  }
}

export function createTriangleWorld(jobIndex = 0): World {
  const setup = CALDER_JOBS[Math.max(0, Math.min(CALDER_JOBS.length - 1, jobIndex))]
  return {
    yard: buildYard(),
    trains: setup.layout(),
    job: setup.job,
    jobIndex: CALDER_JOBS.indexOf(setup),
    jobCount: CALDER_JOBS.length,
    time: 0,
    notice: null,
    cutAt: 1,
    done: false,
  }
}
