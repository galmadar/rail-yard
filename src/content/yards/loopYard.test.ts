import { describe, expect, it } from 'vitest'
import { poseAt, type Polyline, type Vec2 } from '../../sim/geometry'
import { carEdge, frontPose, pathLength, roll, type Train } from '../../sim/train'
import {
  checkJob,
  lockedSwitches,
  playerTrain,
  tick,
  tryThrowSwitch,
  uncouple,
  type Controls,
  type World,
} from '../../sim/World'
import { edge, type Yard } from '../../sim/yard'
import { createLoopWorld } from './loopYard'
import { createWorld as createSmallYard } from './smallYard'

const AHEAD: Controls = { throttle: 1, brake: false }
const BACK: Controls = { throttle: -1, brake: false }
const COAST: Controls = { throttle: 0, brake: false }

/** The whole way round: the loop plus both halves of the yard road. */
function ringLength(y: Yard): number {
  return ['loop', 'yard-west', 'yard-east'].reduce((sum, id) => sum + edge(y, id).line.length, 0)
}

function driveUntil(w: World, c: Controls, seconds: number, done: () => boolean): boolean {
  for (let i = 0; i < seconds * 60; i++) {
    tick(w, 1 / 60, c)
    if (done()) return true
  }
  return false
}

function onEdge(t: Train, id: string): boolean {
  return t.path.some((s) => s.edge === id)
}

describe('the loop', () => {
  it('carries a train right round and back to where it started', () => {
    const w = createLoopWorld()
    const t = playerTrain(w)!
    const start = frontPose(w.yard, t)
    const startEdge = carEdge(w.yard, t, 0)

    const { blocked } = roll(w.yard, t, ringLength(w.yard))

    expect(blocked).toBe(null)
    const end = frontPose(w.yard, t)
    expect(end.x).toBeCloseTo(start.x, 4)
    expect(end.z).toBeCloseTo(start.z, 4)
    expect(carEdge(w.yard, t, 0)).toBe(startEdge)
  })

  it('goes round the other way just the same', () => {
    const w = createLoopWorld()
    const t = playerTrain(w)!
    const start = frontPose(w.yard, t)

    const { blocked } = roll(w.yard, t, -ringLength(w.yard))

    expect(blocked).toBe(null)
    const end = frontPose(w.yard, t)
    expect(end.x).toBeCloseTo(start.x, 4)
    expect(end.z).toBeCloseTo(start.z, 4)
  })

  it('is broken as soon as a set of points is turned off it', () => {
    const w = createLoopWorld()
    const t = playerTrain(w)!
    tryThrowSwitch(w, 'point-3')
    const { blocked } = roll(w.yard, t, ringLength(w.yard))
    expect(blocked).toBe('buffer')
    expect(carEdge(w.yard, t, 0)).toBe('van-road')
  })

  it('does not let the occupied track grow, lap after lap', () => {
    const w = createLoopWorld()
    const ring = ringLength(w.yard)

    for (const t of w.trains) {
      let mostSteps = t.path.length
      // Five laps in short shoves, the way the game rolls it.
      for (let i = 0; i < 5 * 500; i++) {
        roll(w.yard, t, ring / 500)
        mostSteps = Math.max(mostSteps, t.path.length)
        expect(t.head).toBeLessThanOrEqual(pathLength(w.yard, t) + 1e-6)
        expect(t.head).toBeGreaterThanOrEqual(-1e-6)
      }
      expect(mostSteps).toBeLessThanOrEqual(3)
      expect(pathLength(w.yard, t)).toBeLessThan(ring)
      expect(Number.isFinite(t.head)).toBe(true)
    }
  })
})

describe('the runaround', () => {
  it('gets the pilot from one end of a cut to the other', () => {
    const w = createLoopWorld()
    const before = playerTrain(w)!
    expect(before.cars.length).toBe(1)
    // It starts on the yard road east of the wagons, with no way past them.
    expect(carEdge(w.yard, before, 0)).toBe('yard-east')
    expect(frontPose(w.yard, before).x).toBeGreaterThan(
      frontPose(w.yard, w.trains.find((t) => t.id === 'cut')!).x,
    )

    const met = driveUntil(w, AHEAD, 90, () => playerTrain(w)!.cars.length === 4)
    expect(met).toBe(true)

    // Coupled on at the back: the pilot is now the west end and can shove.
    const t = playerTrain(w)!
    expect(t.cars[3].vehicle.kind).toBe('loco')
    expect(t.cars.map((c) => c.vehicle.id)).toEqual(['ore', 'crate-van', 'timber', 'pilot'])
  })

  it('is the only way to that end - shut the loop and the pilot is stuck', () => {
    const w = createLoopWorld()
    tryThrowSwitch(w, 'point-3')
    driveUntil(w, AHEAD, 90, () => playerTrain(w)!.cars.length === 4)
    // Off into the van road and against the stops: it never gets past the cut.
    expect(playerTrain(w)!.cars.length).toBe(1)
    expect(carEdge(w.yard, playerTrain(w)!, 0)).toBe('van-road')
  })

  it('is what the whole job hangs on', () => {
    const w = createLoopWorld()
    expect(checkJob(w)).toBe(false)
    expect(w.done).toBe(false)

    // Run round and pick the cut up from its far end.
    expect(driveUntil(w, AHEAD, 90, () => playerTrain(w)!.cars.length === 4)).toBe(true)

    // Shove the leading wagon into the ore road and leave it there.
    tryThrowSwitch(w, 'point-2')
    expect(
      driveUntil(
        w,
        AHEAD,
        60,
        () => carEdge(w.yard, playerTrain(w)!, 0) === 'ore-road' && playerTrain(w)!.speed === 0,
      ),
    ).toBe(true)
    w.cutAt = 1
    uncouple(w)
    expect(playerTrain(w)!.cars.length).toBe(3)

    // Back out, straighten the points, carry on east to the van road.
    expect(
      driveUntil(
        w,
        BACK,
        60,
        () => !onEdge(playerTrain(w)!, 'ore-road') && !lockedSwitches(w).has('point-2'),
      ),
    ).toBe(true)
    driveUntil(w, COAST, 5, () => playerTrain(w)!.speed === 0)
    tryThrowSwitch(w, 'point-2')
    tryThrowSwitch(w, 'point-3')
    expect(
      driveUntil(
        w,
        AHEAD,
        60,
        () => carEdge(w.yard, playerTrain(w)!, 0) === 'van-road' && playerTrain(w)!.speed === 0,
      ),
    ).toBe(true)
    w.cutAt = 1
    uncouple(w)
    expect(playerTrain(w)!.cars.length).toBe(2)

    // The last wagon only reaches the far road by going all the way round.
    expect(
      driveUntil(
        w,
        BACK,
        60,
        () => !onEdge(playerTrain(w)!, 'van-road') && !lockedSwitches(w).has('point-3'),
      ),
    ).toBe(true)
    driveUntil(w, COAST, 5, () => playerTrain(w)!.speed === 0)
    tryThrowSwitch(w, 'point-3')
    expect(driveUntil(w, AHEAD, 60, () => onEdge(playerTrain(w)!, 'loop'))).toBe(true)
    expect(lockedSwitches(w).has('point-1')).toBe(false)
    tryThrowSwitch(w, 'point-1')
    expect(
      driveUntil(
        w,
        AHEAD,
        90,
        () => carEdge(w.yard, playerTrain(w)!, 0) === 'far-road' && playerTrain(w)!.speed === 0,
      ),
    ).toBe(true)
    w.cutAt = 1
    uncouple(w)

    expect(checkJob(w)).toBe(true)
    // The yard only calls the job done once you are rolling again.
    expect(driveUntil(w, BACK, 5, () => w.done)).toBe(true)
  })
})

describe('the job sheet', () => {
  it('is not already done the moment you arrive', () => {
    const w = createLoopWorld()
    expect(w.done).toBe(false)
    expect(checkJob(w)).toBe(false)
    for (const goal of w.job.goals) {
      const t = w.trains.find((x) => x.cars.some((c) => c.vehicle.id === goal.vehicleId))!
      const i = t.cars.findIndex((c) => c.vehicle.id === goal.vehicleId)
      expect(carEdge(w.yard, t, i)).not.toBe(goal.edgeId)
    }
  })
})

/** Every road, sampled every couple of metres. */
function samples(line: Polyline, step: number): { s: number; p: Vec2 }[] {
  const out: { s: number; p: Vec2 }[] = []
  for (let s = 0; s <= line.length; s += step) out.push({ s, p: poseAt(line, s) })
  return out
}

const CLEARANCE = 3.5
/** Two roads leaving the same points run side by side for a bit - that is a turnout, not a clash. */
const NEAR_POINTS = 20

function closestApproach(y: Yard): { gap: number; where: string } {
  const ids = [...y.edges.keys()]
  let gap = Infinity
  let where = 'nothing'

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = edge(y, ids[i])
      const b = edge(y, ids[j])
      const shared = [a.from, a.to].filter((n) => n === b.from || n === b.to)
      const clearOf = (e: typeof a, s: number) =>
        shared.every((n) => (n === e.from ? s : e.line.length - s) > NEAR_POINTS)

      for (const sa of samples(a.line, 2)) {
        if (!clearOf(a, sa.s)) continue
        for (const sb of samples(b.line, 2)) {
          if (!clearOf(b, sb.s)) continue
          const d = Math.hypot(sa.p.x - sb.p.x, sa.p.z - sb.p.z)
          if (d < gap) {
            gap = d
            where = `${a.id} and ${b.id}`
          }
        }
      }
    }
  }
  return { gap, where }
}

describe('the layout', () => {
  it('never lays one road over another', () => {
    const { gap, where } = closestApproach(createLoopWorld().yard)
    expect(gap, `closest: ${where}`).toBeGreaterThan(CLEARANCE)
  })

  it('holds the older yard to the same rule', () => {
    expect(closestApproach(createSmallYard().yard).gap).toBeGreaterThan(CLEARANCE)
  })
})
