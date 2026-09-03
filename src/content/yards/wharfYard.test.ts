import { describe, expect, it } from 'vitest'
import { moveCut, playerTrain, tick, tryThrowSwitch, uncouple, type World } from '../../sim/World'
import type { SwitchNode } from '../../sim/yard'
import { createWharfWorld } from './wharfYard'

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

// The shunter always ends up on the tail of its own cut, so shoving is throttle
// astern and drawing is throttle ahead, whichever way round the yard it is.
const shove = (w: World) => driveToStop(w, -1)
const draw = (w: World) => driveToStop(w, 1)

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

/** Out to the quay, back down the back road, and stand ready to go forward. */
function upToTheCrane(w: World): void {
  shove(w)
  swap(w, 'point-3')
  draw(w)
  swap(w, 'point-4')
  shove(w)
}

/** Off the crane road and all the way home to the headshunt. */
function downFromTheCrane(w: World): void {
  draw(w)
  swap(w, 'point-4')
  shove(w)
  swap(w, 'point-3')
  draw(w)
}

describe('working Ridley Wharf through', () => {
  it('gets one wagon up to the crane and the shunter home', () => {
    const w = createWharfWorld(0)

    shove(w) // east down the yard road onto the box van
    upToTheCrane(w) // out to the quay, set back, then forward into the crane road
    drop(w, 1)
    downFromTheCrane(w)

    expect(w.done).toBe(true)
  })

  it('deals three wagons out to three different roads', () => {
    const w = createWharfWorld(1)

    shove(w) // onto the back of the rake
    draw(w) // and the lot out onto the headshunt

    swap(w, 'point-2')
    shove(w) // the timber wagon, riding at the front, into the timber road
    drop(w, 1)
    draw(w)

    swap(w, 'point-2')
    swap(w, 'point-1')
    shove(w) // the stone hopper into the stone road
    drop(w, 1)
    draw(w)

    swap(w, 'point-1')
    upToTheCrane(w) // and only the box van left for the long way round
    drop(w, 1)
    downFromTheCrane(w)

    expect(w.done).toBe(true)
  })

  it('makes two trips because the tanker has to go up first', () => {
    const w = createWharfWorld(2)

    shove(w) // onto the tanker and the box van
    shove(w) // on to the quay for the stone hopper
    draw(w) // all three out onto the headshunt

    swap(w, 'point-1')
    shove(w) // the stone hopper away
    drop(w, 1)
    draw(w)
    swap(w, 'point-1')

    // The box van is riding in front of the tanker, so it has to be parked
    // somewhere before the tanker can go up to the buffer stop on its own.
    swap(w, 'point-2')
    shove(w)
    drop(w, 1)
    draw(w)
    swap(w, 'point-2')

    upToTheCrane(w) // the tanker, right down to the stops
    drop(w, 1)
    downFromTheCrane(w)

    swap(w, 'point-2')
    shove(w) // back into the timber road for the box van
    draw(w)
    swap(w, 'point-2')

    upToTheCrane(w) // and up it goes, buffering onto the tanker
    drop(w, 2)
    downFromTheCrane(w)

    expect(w.done).toBe(true)
  })

  it('empties the crane road before it fills it, and leaves the quay till last', () => {
    const w = createWharfWorld(3)

    shove(w) // onto the flat wagon
    shove(w) // on to the quay for the box van
    draw(w)

    // Both of them out of the way in the stone road: the quay has to be clear
    // and the shunter's hands empty before it can go and fetch the tanker.
    swap(w, 'point-1')
    shove(w)
    drop(w, 2)
    draw(w)
    swap(w, 'point-1')

    upToTheCrane(w) // light engine, and buffer onto the tanker
    downFromTheCrane(w)

    // The tanker waits in the timber road. Put it on the quay now and there is
    // no way back up to the crane.
    swap(w, 'point-2')
    shove(w)
    drop(w, 1)
    draw(w)
    swap(w, 'point-2')

    swap(w, 'point-1')
    shove(w) // back for the box van and the flat wagon
    draw(w)
    swap(w, 'point-1')

    upToTheCrane(w) // and up they both go, box van leading
    drop(w, 2)
    downFromTheCrane(w)

    swap(w, 'point-2')
    shove(w) // fetch the tanker again
    draw(w)
    swap(w, 'point-2')

    shove(w) // and out onto the quay with it, last of all
    drop(w, 1)
    draw(w)

    expect(w.done).toBe(true)
  })
})
