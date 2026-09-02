import { describe, expect, it } from 'vitest'
import { createWorld } from '../content/yards/smallYard'
import { playerTrain, tick, tryThrowSwitch, uncouple, type Controls } from './World'
import { carEdge, carSpan, frontPose, roll, trainLength } from './train'

const COAST: Controls = { throttle: 0, brake: false }
const AHEAD: Controls = { throttle: 1, brake: false }

function run(w: ReturnType<typeof createWorld>, seconds: number, c: Controls): void {
  for (let i = 0; i < seconds * 60; i++) tick(w, 1 / 60, c)
}

describe('rolling stock', () => {
  it('keeps its length no matter how far it runs', () => {
    const w = createWorld()
    const t = playerTrain(w)!
    const before = trainLength(t)
    roll(w.yard, t, 40)
    roll(w.yard, t, -25)
    roll(w.yard, t, 12)
    expect(trainLength(t)).toBeCloseTo(before, 9)
  })

  it('comes back to the same spot when you run out and back', () => {
    const w = createWorld()
    const t = playerTrain(w)!
    const start = frontPose(w.yard, t)
    roll(w.yard, t, 30)
    roll(w.yard, t, -30)
    const end = frontPose(w.yard, t)
    expect(end.x).toBeCloseTo(start.x, 6)
    expect(end.z).toBeCloseTo(start.z, 6)
  })

  it('is stopped by the buffer stop and goes no further', () => {
    const w = createWorld()
    const t = playerTrain(w)!
    const { blocked } = roll(w.yard, t, -1000)
    expect(blocked).toBe('buffer')
    expect(carSpan(t, t.cars.length - 1).back).toBeCloseTo(0, 6)
  })

  it('refuses to run through points set against it', () => {
    const w = createWorld()
    const t = playerTrain(w)!
    // Run into the coal road, then swing the points behind you.
    tryThrowSwitch(w, 'point-3')
    roll(w.yard, t, 1000)
    expect(carEdge(w.yard, t, 0)).toBe('coal-road')
    tryThrowSwitch(w, 'point-3')
    const { blocked } = roll(w.yard, t, -1000)
    expect(blocked).toBe('switch-against')
  })
})

describe('shunting', () => {
  it('couples up to a standing wagon and cuts it off again', () => {
    const w = createWorld()
    const t = playerTrain(w)!
    tryThrowSwitch(w, 'point-1')
    expect(t.cars.length).toBe(1)

    run(w, 60, AHEAD)
    const joined = playerTrain(w)!
    expect(joined.cars.length).toBe(2)
    expect(w.trains.length).toBe(3)

    run(w, 2, COAST)
    uncouple(w)
    expect(playerTrain(w)!.cars.length).toBe(1)
    expect(w.trains.length).toBe(4)
  })

  it('never loses or invents a vehicle while shunting', () => {
    const w = createWorld()
    const count = () => w.trains.reduce((n, t) => n + t.cars.length, 0)
    expect(count()).toBe(4)
    tryThrowSwitch(w, 'point-1')
    run(w, 60, AHEAD)
    expect(count()).toBe(4)
    run(w, 2, COAST)
    uncouple(w)
    expect(count()).toBe(4)
  })

  it('knows which road each wagon is standing on', () => {
    const w = createWorld()
    const tanker = w.trains.find((t) => t.cars[0].vehicle.id === 'tanker')!
    expect(carEdge(w.yard, tanker, 0)).toBe('goods-road')
  })
})

describe('the job sheet', () => {
  it('is not finished when the wagons start in the wrong roads', () => {
    const w = createWorld()
    expect(w.done).toBe(false)
  })
})
