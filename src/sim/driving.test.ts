import { describe, expect, it } from 'vitest'
import { createWorld } from '../content/yards/smallYard'
import { playerTrain, tick, type Controls, type World } from './World'
import { carSpan, frontPose, trainLength } from './train'
import { TUNING } from './tuning'

const COAST: Controls = { throttle: 0, brake: false }
const NOSE_FIRST: Controls = { throttle: 1, brake: false }
const BRAKE: Controls = { throttle: 0, brake: true }

/** Seconds of standing start it takes to wind right up to the stop. */
function timeToFlatOut(w: World): number {
  const t = playerTrain(w)!
  for (let i = 1; i <= 60 * 10; i++) {
    tick(w, 1 / 60, NOSE_FIRST)
    if (Math.abs(t.speed) >= TUNING.maxSpeed - 0.01) return i / 60
  }
  throw new Error('it never got up to speed')
}

describe('how it drives', () => {
  it('is flat out in about a second and a half', () => {
    const seconds = timeToFlatOut(createWorld())
    expect(seconds).toBeGreaterThan(1.2)
    expect(seconds).toBeLessThan(1.8)
  })

  it('pulls up from full speed inside a train length or two', () => {
    const w = createWorld()
    const t = playerTrain(w)!
    timeToFlatOut(w)

    const from = frontPose(w.yard, t).x
    for (let i = 0; i < 60 * 10 && t.speed !== 0; i++) tick(w, 1 / 60, BRAKE)

    expect(t.speed).toBe(0)
    // The headshunt is dead straight in x, so x is the distance.
    expect(Math.abs(frontPose(w.yard, t).x - from)).toBeLessThan(14)
  })
})

/**
 * Run the shunter flat out at the box van standing on the spare road, and say
 * where the van's tail was before it was hit.
 */
function chargeTheVan(dt: number): { w: World; vanTail: number } {
  const w = createWorld(0)
  const t = playerTrain(w)!
  t.path = [{ edge: 'spare', forward: true }]
  t.head = 12

  const van = w.trains.find((x) => x.cars[0].vehicle.id === 'van')!
  const vanTail = van.head - trainLength(van)

  for (let i = 0; i < 500; i++) {
    // Held wide open however coarse the tick - the coarse tick is the point.
    t.speed = TUNING.maxSpeed
    tick(w, dt, COAST)
    if (playerTrain(w)!.cars.length > 1) break
  }
  return { w, vanTail }
}

/**
 * A frame can always come out longer than the one before it, and the shunter is
 * fast enough that a long one covers more track than a coupler can reach across.
 */
describe('running at a standing cut', () => {
  const frames: [string, number][] = [
    ['a good frame', 1 / 60],
    ['the longest frame the game will take', 1 / 30],
    ['a badly dropped frame', 1 / 6],
  ]

  for (const [name, dt] of frames) {
    it(`buffers up on ${name} instead of passing clean through`, () => {
      const { w, vanTail } = chargeTheVan(dt)
      const t = playerTrain(w)!
      expect(t.cars.map((c) => c.vehicle.id)).toEqual(['van', 'shunter'])
      expect(t.speed).toBe(0)
      // Stopped behind the van, not hooked on to its far end having gone through it.
      expect(carSpan(t, 1).front).toBeLessThan(vanTail)
      expect(t.cars[0].reversed).toBe(false)
    })
  }
})
