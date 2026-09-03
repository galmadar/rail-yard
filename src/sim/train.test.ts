import { describe, expect, it } from 'vitest'
import { createWorld } from '../content/yards/smallYard'
import { playerTrain, tick, tryThrowSwitch, uncouple, type Controls, type World } from './World'
import { TUNING } from './tuning'
import { carEdge, carSpan, frontPose, hasLoco, roll, trainLength, type Train } from './train'

const COAST: Controls = { throttle: 0, brake: false }
// The shunter stands nose to the west, so driving east means throttle astern.
const EAST: Controls = { throttle: -1, brake: false }
const WEST: Controls = { throttle: 1, brake: false }
const BRAKE: Controls = { throttle: 0, brake: true }

function run(w: ReturnType<typeof createWorld>, seconds: number, c: Controls): void {
  for (let i = 0; i < seconds * 60; i++) tick(w, 1 / 60, c)
}

function cars(w: World): number {
  return w.trains.reduce((n, t) => n + t.cars.length, 0)
}

function trainWith(w: World, id: string): Train {
  return w.trains.find((t) => t.cars.some((c) => c.vehicle.id === id))!
}

/**
 * Put the shunter and the box van together on the headshunt facing east, with
 * room to get a move on. `pushing` puts the van out in front, ready to be kicked.
 */
function hooked(w: World, order: 'pulling' | 'pushing'): void {
  const t = playerTrain(w)!
  const van = trainWith(w, 'van')
  t.cars = order === 'pulling' ? [...t.cars, ...van.cars] : [...van.cars, ...t.cars]
  t.path = [{ edge: 'headshunt', forward: true }]
  t.head = 30
  t.speed = 0
  w.trains = w.trains.filter((x) => x !== van)
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

    run(w, 60, EAST)
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
    const count = () => cars(w)
    expect(count()).toBe(4)
    tryThrowSwitch(w, 'point-1')
    run(w, 60, EAST)
    expect(count()).toBe(4)
    // Pull the pin on the move, so the wagon carries on rolling by itself.
    run(w, 2, WEST)
    uncouple(w)
    expect(count()).toBe(4)
    run(w, 40, COAST)
    expect(count()).toBe(4)
  })

  it('knows which road each wagon is standing on', () => {
    const w = createWorld()
    const tanker = w.trains.find((t) => t.cars[0].vehicle.id === 'tanker')!
    expect(carEdge(w.yard, tanker, 0)).toBe('goods-road')
  })
})

describe('wagons running loose', () => {
  it('keeps the speed it was let go at, then runs down to a stand', () => {
    const w = createWorld()
    hooked(w, 'pushing')
    // Half a second is plenty of a shove now - any more and it reaches the stops.
    run(w, 0.5, EAST)
    const speed = playerTrain(w)!.speed
    uncouple(w)

    const cut = trainWith(w, 'van')
    expect(hasLoco(cut)).toBe(false)
    expect(cut.speed).toBeCloseTo(speed, 6)

    const from = frontPose(w.yard, cut).x
    run(w, 40, COAST)
    expect(cut.speed).toBe(0)
    // The roads it runs down are all dead straight in x, so x is the distance.
    const rolled = frontPose(w.yard, cut).x - from
    expect(rolled).toBeCloseTo((speed * speed) / (2 * TUNING.rollingResistance), 0)
  })

  it('buffers up to a cut standing in the road', () => {
    const w = createWorld()
    hooked(w, 'pushing')
    tryThrowSwitch(w, 'point-1')
    run(w, 2, EAST)
    uncouple(w)
    run(w, 1, BRAKE)
    run(w, 40, COAST)

    const joined = trainWith(w, 'van')
    expect(joined.cars.map((c) => c.vehicle.id)).toEqual(['tanker', 'van'])
    expect(joined.speed).toBe(0)
    expect(cars(w)).toBe(4)
    expect(w.trains.length).toBe(3)
  })

  it('is stopped by the buffer stop, and says so once', () => {
    const w = createWorld()
    hooked(w, 'pushing')
    run(w, 2, EAST)
    uncouple(w)
    run(w, 1, BRAKE)
    run(w, 60, COAST)

    const cut = trainWith(w, 'van')
    expect(cut.speed).toBe(0)
    expect(frontPose(w.yard, cut).x).toBeCloseTo(95, 6)
    expect(w.notice!.text).toContain('buffer stop')
    // The notice is stale by now - it fired when the cut stopped, not every frame.
    expect(w.time - w.notice!.at).toBeGreaterThan(10)
  })

  it('is stopped by points set against it', () => {
    const w = createWorld()
    hooked(w, 'pulling')
    // Out on the spare road, so the loose cut runs back at the points face on.
    const t = playerTrain(w)!
    t.path = [{ edge: 'spare', forward: true }]
    t.head = 60
    run(w, 1, WEST)
    uncouple(w)
    run(w, 1, BRAKE)

    const cut = trainWith(w, 'van')
    expect(cut.speed).toBeLessThan(0)
    tryThrowSwitch(w, 'point-3')
    run(w, 30, COAST)
    expect(cut.speed).toBe(0)
    expect(carEdge(w.yard, cut, 0)).toBe('spare')
    expect(w.notice!.text).toContain('points')
  })

  it('lets you drop a cut into a siding and take the loco elsewhere', () => {
    const w = createWorld()
    hooked(w, 'pulling')
    run(w, 0.5, EAST)
    uncouple(w)
    // Run on hard, clear the points, then set the road behind you for the cut.
    run(w, 2, EAST)
    tryThrowSwitch(w, 'point-1')
    run(w, 2, BRAKE)
    run(w, 60, COAST)

    const cut = trainWith(w, 'van')
    expect(cut.speed).toBe(0)
    expect(carEdge(w.yard, cut, 0)).toBe('goods-road')
    expect(carEdge(w.yard, playerTrain(w)!, 0)).not.toBe('goods-road')
    expect(cars(w)).toBe(4)
    expect(w.trains.length).toBe(4)
  })
})

describe('the job sheet', () => {
  it('is not finished when the wagons start in the wrong roads', () => {
    const w = createWorld()
    expect(w.done).toBe(false)
  })
})
