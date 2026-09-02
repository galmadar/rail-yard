import { describe, expect, it } from 'vitest'
import { join, poseAt, sCurve, straight } from './geometry'

describe('track shapes', () => {
  it('measures a straight correctly', () => {
    const line = straight({ x: 0, z: 0 }, { x: 30, z: 40 })
    expect(line.length).toBeCloseTo(50, 9)
  })

  it('leaves and arrives level, so it joins straight track without a kink', () => {
    const line = sCurve({ x: 0, z: 0 }, { x: 40, z: -20 })
    expect(poseAt(line, 0.01).heading).toBeCloseTo(0, 2)
    expect(poseAt(line, line.length - 0.01).heading).toBeCloseTo(0, 2)
  })

  it('adds up when two shapes are joined end to end', () => {
    const a = straight({ x: 0, z: 0 }, { x: 10, z: 0 })
    const b = straight({ x: 10, z: 0 }, { x: 10, z: -10 })
    expect(join(a, b).length).toBeCloseTo(20, 9)
  })
})
