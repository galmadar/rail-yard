import { describe, expect, it } from 'vitest'
import { createWorld } from '../content/yards/smallYard'
import { moveCut, playerTrain, tick, tryThrowSwitch, uncouple, type World } from './World'

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

/** Pull the pin so `leave` vehicles are left standing at the leading end. */
function drop(w: World, leave: number): void {
  const before = playerTrain(w)!.cars.length
  moveCut(w, leave - w.cutAt)
  expect(w.cutAt).toBe(leave)
  uncouple(w)
  expect(playerTrain(w)!.cars.length).toBe(before - leave)
}

const east = (w: World) => driveToStop(w, 1)
const west = (w: World) => driveToStop(w, -1)

describe('working the jobs through', () => {
  it('makes up the goods train by picking the wagons up backwards', () => {
    const w = createWorld(1)

    east(w) // down the spare road for the coal hopper
    west(w)

    tryThrowSwitch(w, 'point-2')
    east(w) // into the oil road, hopper first, and pick up the tanker
    west(w)

    tryThrowSwitch(w, 'point-2')
    tryThrowSwitch(w, 'point-3')
    east(w) // into the coal road for the box van, now on the leading end
    west(w)

    tryThrowSwitch(w, 'point-3')
    tryThrowSwitch(w, 'point-1')
    east(w) // and shove all three down the goods road, van deepest
    drop(w, 3)
    west(w)

    expect(w.done).toBe(true)
  })

  it('breaks the long train up using the spare road to hold two back', () => {
    const w = createWorld(2)

    tryThrowSwitch(w, 'point-1')
    east(w) // onto the back of the rake standing in the goods road
    west(w) // and draw the lot out onto the headshunt

    tryThrowSwitch(w, 'point-1')
    east(w) // park the brake van and the flat wagon out of the way
    drop(w, 2)
    west(w)

    tryThrowSwitch(w, 'point-2')
    east(w) // the tanker to the oil road
    drop(w, 1)
    west(w)

    tryThrowSwitch(w, 'point-2')
    tryThrowSwitch(w, 'point-3')
    east(w) // the coal hopper right down the coal road
    drop(w, 1)
    west(w)

    tryThrowSwitch(w, 'point-3')
    tryThrowSwitch(w, 'point-1')
    east(w) // the box van right down the goods road
    drop(w, 1)
    west(w)

    tryThrowSwitch(w, 'point-1')
    east(w) // back for the two waiting on the spare road
    west(w)

    tryThrowSwitch(w, 'point-1')
    east(w) // the brake van in behind the box van
    drop(w, 2)
    west(w)

    tryThrowSwitch(w, 'point-1')
    tryThrowSwitch(w, 'point-3')
    east(w) // the flat wagon in behind the coal hopper
    drop(w, 2)
    west(w) // and the shunter home to the headshunt, on its own

    expect(playerTrain(w)!.cars.length).toBe(1)
    expect(w.done).toBe(true)
  })
})
