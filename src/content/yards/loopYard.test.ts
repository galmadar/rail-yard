import { describe, expect, it } from 'vitest'
import { carEdge, pathLength, roll, type Train } from '../../sim/train'
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

// The pilot faces back down its own path, so running the way the path runs
// means throttle astern.
const ALONG: Controls = { throttle: -1, brake: false }
const BACK: Controls = { throttle: 1, brake: false }
const COAST: Controls = { throttle: 0, brake: false }

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

/** Once round the ring: the loop plus the yard road that closes it. */
function ringLength(y: Yard): number {
  return ['loop', 'yard-west', 'yard-east'].reduce((sum, id) => sum + edge(y, id).line.length, 0)
}

describe('the runaround', () => {
  it('is what the whole job hangs on', () => {
    const w = createLoopWorld()
    expect(checkJob(w)).toBe(false)
    expect(w.done).toBe(false)

    // Run round and pick the cut up from its far end.
    expect(driveUntil(w, ALONG, 90, () => playerTrain(w)!.cars.length === 4)).toBe(true)

    // Shove the leading wagon into the ore road and leave it there.
    tryThrowSwitch(w, 'point-2')
    expect(
      driveUntil(
        w,
        ALONG,
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
        ALONG,
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
    expect(driveUntil(w, ALONG, 60, () => onEdge(playerTrain(w)!, 'loop'))).toBe(true)
    expect(lockedSwitches(w).has('point-1')).toBe(false)
    tryThrowSwitch(w, 'point-1')
    expect(
      driveUntil(
        w,
        ALONG,
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

describe('going round and round', () => {
  // A closed ring is the one place a train can run for ever. If the record of
  // the track it stands on grew each lap, wagons would start going missing.
  it('does not let the occupied track grow, lap after lap', () => {
    const w = createLoopWorld()
    const ring = ringLength(w.yard)

    for (const t of w.trains) {
      let mostSteps = t.path.length
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
