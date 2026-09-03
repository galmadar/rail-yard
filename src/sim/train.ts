import type { Pose } from './geometry'
import { TUNING } from './tuning'
import type { Vehicle } from './vehicles'
import {
  continueThrough,
  entryNode,
  exitNode,
  poseAlong,
  stepLength,
  type Step,
  type Yard,
} from './yard'

/** A vehicle as it sits in a train: `reversed` if it was coupled on nose-first. */
export interface Car {
  vehicle: Vehicle
  reversed: boolean
}

/**
 * A cut of vehicles standing on the track.
 *
 * `path` is the chain of track it occupies, ordered the way the train faces.
 * `head` is how far along that chain the leading buffer sits, so the train
 * covers `[head - length, head]`. Cars run front to back: `cars[0]` leads.
 */
export interface Train {
  id: string
  cars: Car[]
  path: Step[]
  head: number
  speed: number
}

export type Blocked = 'buffer' | 'switch-against' | null

export function trainLength(t: Train): number {
  const cars = t.cars.reduce((sum, c) => sum + c.vehicle.length, 0)
  return cars + TUNING.couplingGap * Math.max(0, t.cars.length - 1)
}

export function pathLength(y: Yard, t: Train): number {
  return t.path.reduce((sum, s) => sum + stepLength(y, s), 0)
}

export function hasLoco(t: Train): boolean {
  return t.cars.some((c) => c.vehicle.kind === 'loco')
}

/**
 * Which way along the path the shunter's yellow end - its nose - points.
 * The shunter is drawn nose to the tail of its own path, so one that has never
 * been turned round faces back down it, and forward means -1.
 */
export function noseWay(t: Train): number {
  const loco = t.cars.find((c) => c.vehicle.kind === 'loco')
  return loco && loco.reversed ? 1 : -1
}

/** Arc position of the leading buffer of car `i`, and of its trailing buffer. */
export function carSpan(t: Train, i: number): { front: number; back: number } {
  let front = t.head
  for (let j = 0; j < i; j++) front -= t.cars[j].vehicle.length + TUNING.couplingGap
  return { front, back: front - t.cars[i].vehicle.length }
}

/** Where a point `s` along the occupied path sits in the world. */
export function poseOnPath(y: Yard, t: Train, s: number): Pose {
  let remaining = Math.max(0, Math.min(pathLength(y, t), s))
  for (const step of t.path) {
    const len = stepLength(y, step)
    if (remaining <= len) return poseAlong(y, step, remaining)
    remaining -= len
  }
  const last = t.path[t.path.length - 1]
  return poseAlong(y, last, stepLength(y, last))
}

export function carPose(y: Yard, t: Train, i: number): Pose {
  const { front, back } = carSpan(t, i)
  return poseOnPath(y, t, (front + back) / 2)
}

export function frontPose(y: Yard, t: Train): Pose {
  return poseOnPath(y, t, t.head)
}

export function backPose(y: Yard, t: Train): Pose {
  return poseOnPath(y, t, t.head - trainLength(t))
}

/** Which edge a given car is standing on - what the job sheet checks. */
export function carEdge(y: Yard, t: Train, i: number): string {
  const { front, back } = carSpan(t, i)
  let remaining = (front + back) / 2
  for (const step of t.path) {
    const len = stepLength(y, step)
    if (remaining <= len) return step.edge
    remaining -= len
  }
  return t.path[t.path.length - 1].edge
}

/** Drop track the train no longer stands on, so the path never grows forever. */
function trim(y: Yard, t: Train): void {
  const len = trainLength(t)
  while (t.path.length > 1) {
    const first = stepLength(y, t.path[0])
    if (t.head - len < first) break
    t.path.shift()
    t.head -= first
  }
  while (t.path.length > 1) {
    const last = stepLength(y, t.path[t.path.length - 1])
    if (t.head > pathLength(y, t) - last) break
    t.path.pop()
  }
}

/**
 * Roll the train `d` metres along its path (negative rolls backwards),
 * extending onto fresh track as it goes. Returns how far it actually got and
 * what stopped it short.
 */
export function roll(y: Yard, t: Train, d: number): { moved: number; blocked: Blocked } {
  const len = trainLength(t)
  let blocked: Blocked = null
  let want = Math.abs(d)
  let moved = 0

  if (d >= 0) {
    while (want > 1e-9) {
      const room = pathLength(y, t) - t.head
      if (room >= want) {
        t.head += want
        moved += want
        want = 0
        break
      }
      t.head += room
      moved += room
      want -= room
      const last = t.path[t.path.length - 1]
      const next = continueThrough(y, exitNode(y, last), last.edge)
      if (!next.ok) {
        blocked = next.reason
        break
      }
      t.path.push(next.step)
    }
  } else {
    while (want > 1e-9) {
      const room = t.head - len
      if (room >= want) {
        t.head -= want
        moved -= want
        want = 0
        break
      }
      t.head -= room
      moved -= room
      want -= room
      const first = t.path[0]
      const back = continueThrough(y, entryNode(y, first), first.edge)
      if (!back.ok) {
        blocked = back.reason
        break
      }
      // continueThrough hands it back pointing away from us; we go the other way.
      const step: Step = { edge: back.step.edge, forward: !back.step.forward }
      t.path.unshift(step)
      const added = stepLength(y, step)
      t.head += added
    }
  }

  trim(y, t)
  return { moved, blocked }
}

/**
 * Grow the path so it really covers everything the train now stands on.
 * Coupling rewrites the ends of a train without moving a wheel, so the track
 * underneath has to catch up.
 */
export function ensureCovered(y: Yard, t: Train): Blocked {
  let blocked: Blocked = null
  while (t.head > pathLength(y, t) + 1e-9) {
    const last = t.path[t.path.length - 1]
    const next = continueThrough(y, exitNode(y, last), last.edge)
    if (!next.ok) {
      blocked = next.reason
      t.head = pathLength(y, t)
      break
    }
    t.path.push(next.step)
  }
  while (t.head - trainLength(t) < -1e-9) {
    const first = t.path[0]
    const back = continueThrough(y, entryNode(y, first), first.edge)
    if (!back.ok) {
      blocked = back.reason
      t.head = trainLength(t)
      break
    }
    const step: Step = { edge: back.step.edge, forward: !back.step.forward }
    t.path.unshift(step)
    t.head += stepLength(y, step)
  }
  trim(y, t)
  return blocked
}

/** The junctions a train is standing across. Points under a wheel cannot move. */
export function occupiedJunctions(y: Yard, t: Train): string[] {
  const out: string[] = []
  for (let i = 0; i < t.path.length - 1; i++) out.push(exitNode(y, t.path[i]))
  return out
}

export function reverseCars(cars: Car[]): Car[] {
  return cars.map((c) => ({ vehicle: c.vehicle, reversed: !c.reversed })).reverse()
}

/**
 * Cut the train in two at the coupling in front of car `index`.
 * Both halves carry on at the speed they were doing - pulling the pin takes
 * nothing away from the wagons behind it.
 */
export function split(y: Yard, t: Train, index: number, newId: string): Train | null {
  if (index <= 0 || index >= t.cars.length) return null
  const front = t.cars.slice(0, index)
  const rear = t.cars.slice(index)
  const frontLen =
    front.reduce((s, c) => s + c.vehicle.length, 0) + TUNING.couplingGap * (front.length - 1)

  const rearTrain: Train = {
    id: newId,
    cars: rear,
    path: [...t.path],
    head: t.head - frontLen - TUNING.couplingGap,
    speed: t.speed,
  }
  t.cars = front
  trim(y, t)
  trim(y, rearTrain)
  return rearTrain
}
