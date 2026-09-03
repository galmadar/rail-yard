import { describe, expect, it } from 'vitest'
import { Steering, noseTowardsScreenRight } from './steering'

// The camera's right vector when it is looking north up the yard: world +x.
const LOOKING_NORTH = { x: 1, z: 0 }
const SWUNG_ROUND = { x: -1, z: 0 }
const EAST = 0
const WEST = Math.PI

function way(cam: { x: number; z: number }, heading: number, nose = 1): number {
  return noseTowardsScreenRight(cam.x, cam.z, heading, nose)
}

describe('right on the screen', () => {
  it('drives east when east is to the right', () => {
    const s = new Steering()
    expect(s.throttle(way(LOOKING_NORTH, EAST), 1, 0)).toBeCloseTo(1)
  })

  it('drives west once the camera is swung round, for the same key', () => {
    const s = new Steering()
    expect(s.throttle(way(SWUNG_ROUND, EAST), 1, 0)).toBeCloseTo(-1)
  })

  it('follows the loco round when it is turned about', () => {
    const s = new Steering()
    expect(s.throttle(way(LOOKING_NORTH, WEST), 1, 0)).toBeCloseTo(-1)
  })

  it('takes account of the nose being at the back of the cut', () => {
    const s = new Steering()
    expect(s.throttle(way(LOOKING_NORTH, EAST, -1), 1, 0)).toBeCloseTo(-1)
  })

  it('holds its answer while the train runs at the camera', () => {
    const s = new Steering()
    s.throttle(way(LOOKING_NORTH, EAST), 1, 0)
    // Now nearly end-on, and wobbling across the sign - it must not flip.
    for (const wobble of [0.05, -0.04, 0.02, -0.06]) {
      expect(s.throttle(wobble, 1, 12)).toBeCloseTo(1)
    }
  })

  it('takes a fresh reading once you are standing still again', () => {
    const s = new Steering()
    s.throttle(way(LOOKING_NORTH, EAST), 1, 0)
    s.throttle(-0.05, 0, 0)
    expect(s.throttle(-0.05, 1, 0)).toBeCloseTo(-1)
  })

  it('sits still when you are not asking for anything', () => {
    const s = new Steering()
    expect(s.throttle(way(LOOKING_NORTH, EAST), 0, 0)).toBe(0)
  })
})
