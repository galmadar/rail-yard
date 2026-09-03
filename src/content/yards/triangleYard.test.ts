import { describe, expect, it } from 'vitest'
import { moveCut, playerTrain, tick, tryThrowSwitch, uncouple, type World } from '../../sim/World'
import type { SwitchNode } from '../../sim/yard'
import { createTriangleWorld } from './triangleYard'

/** Drive on until something stops you: a buffer stop, or buffering up to a cut. */
function driveToStop(w: World, throttle: number): void {
  let rolling = false
  for (let i = 0; i < 60 * 180; i++) {
    tick(w, 1 / 60, { throttle, brake: false })
    const speed = playerTrain(w)!.speed
    if (Math.abs(speed) > 0.5) rolling = true
    else if (rolling) return
  }
  throw new Error('the shunter never came to a stand')
}

// Forward is whichever way the shunter's nose points, and the triangle keeps
// turning that round, so these two just mean "ahead" and "astern".
const shove = (w: World) => driveToStop(w, 1)
const draw = (w: World) => driveToStop(w, -1)

/** Move a point over, and prove it really went - a wheel on it would refuse. */
function swap(w: World, id: string): void {
  const before = (w.yard.nodes.get(id) as SwitchNode).state
  tryThrowSwitch(w, id)
  expect((w.yard.nodes.get(id) as SwitchNode).state, id).not.toBe(before)
}

/** Pull the pin so `leave` vehicles are left standing at the leading end. */
function drop(w: World, leave: number): void {
  const before = playerTrain(w)!.cars.length
  moveCut(w, leave - w.cutAt)
  expect(w.cutAt).toBe(leave)
  uncouple(w)
  expect(playerTrain(w)!.cars.length).toBe(before - leave)
}

/** Up the west curve, over the top, and back down the east one. */
function turnClockwise(w: World): void {
  swap(w, 'point-2')
  shove(w)
  swap(w, 'point-5')
  swap(w, 'point-4')
  draw(w)
  swap(w, 'point-4')
}

describe('working Calder Triangle through', () => {
  it('can only reach the sand road by turning the train round', () => {
    const w = createTriangleWorld(0)

    shove(w) // onto the sand hopper
    draw(w) // and back out onto the headshunt, clear of the triangle

    turnClockwise(w) // and out onto the east road the other way up

    swap(w, 'point-3')
    shove(w) // west into the sand road, hopper leading
    drop(w, 1)
    draw(w)

    swap(w, 'point-3')
    swap(w, 'point-2')
    shove(w) // and home to the headshunt

    expect(w.done).toBe(true)
  })

  it('takes three wagons round in one go and they stay in step', () => {
    const w = createTriangleWorld(1)

    shove(w) // onto the tail of the rake

    turnClockwise(w)

    swap(w, 'point-3')
    shove(w) // the whole rake into the sand road, crate van deepest
    drop(w, 3)
    draw(w)

    swap(w, 'point-3')
    swap(w, 'point-2')
    shove(w)

    expect(w.done).toBe(true)
  })

  it('goes round twice: one lot turned, the other lot turned back', () => {
    const w = createTriangleWorld(2)

    swap(w, 'point-2')
    shove(w) // up the west curve for the timber wagon parked on the top road
    swap(w, 'point-5')
    swap(w, 'point-4')
    draw(w)
    swap(w, 'point-4')

    swap(w, 'point-3')
    shove(w) // west into the sand road with it
    drop(w, 1)
    draw(w)

    swap(w, 'point-3')
    swap(w, 'point-2')
    shove(w) // west onto the rake waiting on the yard road
    draw(w) // and out onto the east road

    // Round the other way this time, which puts the crate van back on the front
    // where the mill road wants it.
    swap(w, 'point-4')
    shove(w)
    swap(w, 'point-5')
    swap(w, 'point-2')
    draw(w)

    swap(w, 'point-1')
    shove(w) // into the mill road, crate van deepest
    drop(w, 2)
    draw(w)

    expect(w.done).toBe(true)
  })
})
