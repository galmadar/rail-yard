import { describe, expect, it } from 'vitest'
import { createWorld } from '../content/yards/smallYard'
import { playerTrain, tick, type Controls, type World } from './World'
import { carSpan, trainLength } from './train'
import { TUNING } from './tuning'

const COAST: Controls = { throttle: 0, brake: false }

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
  it('buffers up on a badly dropped frame instead of passing clean through', () => {
    const { w, vanTail } = chargeTheVan(1 / 6)
    const t = playerTrain(w)!
    expect(t.cars.map((c) => c.vehicle.id)).toEqual(['van', 'shunter'])
    expect(t.speed).toBe(0)
    // Stopped behind the van, not hooked on to its far end having gone through it.
    expect(carSpan(t, 1).front).toBeLessThan(vanTail)
    expect(t.cars[0].reversed).toBe(false)
  })
})
