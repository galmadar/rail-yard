import { TUNING } from './tuning'
import {
  backPose,
  carEdge,
  ensureCovered,
  frontPose,
  hasLoco,
  occupiedJunctions,
  reverseCars,
  roll,
  split,
  trainLength,
  type Blocked,
  type Train,
} from './train'
import { throwSwitch, type NodeId, type Yard } from './yard'

export interface Goal {
  vehicleId: string
  edgeId: string
  /** How the job sheet words it. */
  text: string
}

export interface Job {
  title: string
  goals: Goal[]
}

export interface Controls {
  /** -1 full reverse, +1 full forward. */
  throttle: number
  brake: boolean
}

export interface Notice {
  text: string
  tone: 'info' | 'warn' | 'good'
  at: number
}

export interface World {
  yard: Yard
  trains: Train[]
  job: Job
  time: number
  notice: Notice | null
  /** Which coupling the player has picked out, counted back from the front. */
  cutAt: number
  done: boolean
}

let nextTrainId = 1000

export function playerTrain(w: World): Train | null {
  return w.trains.find(hasLoco) ?? null
}

export function say(w: World, text: string, tone: Notice['tone'] = 'info'): void {
  w.notice = { text, tone, at: w.time }
}

/** Points with a wheel on them are locked - you cannot move the road under a train. */
export function lockedSwitches(w: World): Set<NodeId> {
  const locked = new Set<NodeId>()
  for (const t of w.trains) for (const n of occupiedJunctions(w.yard, t)) locked.add(n)
  return locked
}

export function tryThrowSwitch(w: World, id: NodeId): void {
  const node = w.yard.nodes.get(id)
  if (!node || node.kind !== 'switch') return
  if (lockedSwitches(w).has(id)) {
    say(w, `${node.label} has a wheel on it - pull clear first`, 'warn')
    return
  }
  throwSwitch(w.yard, id)
  const now = w.yard.nodes.get(id)
  if (now && now.kind === 'switch') say(w, `${node.label} set to ${now.state}`)
}

function dist(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

/**
 * Buffer up to a standing cut and you are hooked on. Which way round the other
 * cut is decides how its wagons slot into the new train.
 */
function tryCouple(w: World, t: Train, movingForward: boolean): boolean {
  const y = w.yard
  const ourEnd = movingForward ? frontPose(y, t) : backPose(y, t)

  for (const other of w.trains) {
    if (other === t) continue
    const oFront = frontPose(y, other)
    const oBack = backPose(y, other)
    const dFront = dist(ourEnd, oFront)
    const dBack = dist(ourEnd, oBack)
    const near = Math.min(dFront, dBack)
    if (near > TUNING.couplingReach) continue

    const metTheirFront = dFront <= dBack
    const theirCars = metTheirFront ? reverseCars(other.cars) : other.cars
    const otherLen = trainLength(other)

    if (movingForward) {
      t.cars = [...theirCars, ...t.cars]
      t.head += TUNING.couplingGap + otherLen
    } else {
      t.cars = [...t.cars, ...(metTheirFront ? other.cars : reverseCars(other.cars))]
    }

    ensureCovered(y, t)
    w.trains = w.trains.filter((x) => x !== other)

    const rough = Math.abs(t.speed) > TUNING.safeCouplingSpeed
    t.speed = 0
    say(
      w,
      rough ? 'coupled - but that was a thump' : 'coupled up',
      rough ? 'warn' : 'good',
    )
    return true
  }
  return false
}

export function uncouple(w: World): void {
  const t = playerTrain(w)
  if (!t) return
  if (t.cars.length < 2) {
    say(w, 'nothing to cut off', 'warn')
    return
  }
  if (Math.abs(t.speed) > 0.15) {
    say(w, 'stand still before you pull the pin', 'warn')
    return
  }
  const index = Math.max(1, Math.min(t.cars.length - 1, w.cutAt))
  const rear = split(w.yard, t, index, `cut-${nextTrainId++}`)
  if (!rear) return
  w.trains.push(rear)
  w.cutAt = Math.max(1, Math.min(t.cars.length - 1, w.cutAt))
  say(w, `cut off ${rear.cars.length} behind`, 'good')
}

export function moveCut(w: World, delta: number): void {
  const t = playerTrain(w)
  if (!t) return
  w.cutAt = Math.max(1, Math.min(Math.max(1, t.cars.length - 1), w.cutAt + delta))
}

function reportBlock(w: World, blocked: Blocked): void {
  if (blocked === 'buffer') say(w, 'buffer stop', 'warn')
  else if (blocked === 'switch-against') say(w, 'the points are set against you', 'warn')
}

export function checkJob(w: World): boolean {
  const y = w.yard
  const player = playerTrain(w)
  for (const goal of w.job.goals) {
    let placed = false
    for (const t of w.trains) {
      const i = t.cars.findIndex((c) => c.vehicle.id === goal.vehicleId)
      if (i < 0) continue
      // Still hooked to the loco means still in your hands, not delivered.
      if (t === player) return false
      if (carEdge(y, t, i) === goal.edgeId) placed = true
    }
    if (!placed) return false
  }
  return true
}

export function tick(w: World, dt: number, controls: Controls): void {
  w.time += dt
  const t = playerTrain(w)
  if (!t) return

  // Forward always means the way the shunter's nose points, whichever way round
  // it ended up in the cut.
  const locoCar = t.cars.find((c) => c.vehicle.kind === 'loco')
  const nose = locoCar && locoCar.reversed ? -1 : 1
  const target = controls.throttle * nose * TUNING.maxSpeed
  if (controls.brake) {
    const drop = TUNING.braking * dt
    t.speed = Math.abs(t.speed) <= drop ? 0 : t.speed - Math.sign(t.speed) * drop
  } else if (controls.throttle !== 0) {
    const rate = TUNING.acceleration * dt
    t.speed += Math.sign(target - t.speed) * Math.min(rate, Math.abs(target - t.speed))
  } else {
    const drop = TUNING.drag * dt
    t.speed = Math.abs(t.speed) <= drop ? 0 : t.speed - Math.sign(t.speed) * drop
  }

  if (t.speed === 0) return
  const before = t.speed
  const { blocked } = roll(w.yard, t, t.speed * dt)
  if (blocked) {
    t.speed = 0
    reportBlock(w, blocked)
    return
  }
  if (tryCouple(w, t, before > 0)) {
    w.cutAt = Math.max(1, Math.min(t.cars.length - 1, w.cutAt))
  }

  if (!w.done && checkJob(w)) {
    w.done = true
    say(w, 'job done - the yard is clear', 'good')
  }
}
