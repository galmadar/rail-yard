import { TUNING } from './tuning'
import {
  backPose,
  carEdge,
  carSpan,
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
  /** Where in the line it stands: 1 nearest the dead end, 2 behind it, and so on. */
  order?: number
  /** Nothing may be coupled to it - how the shunter finishes on its own. */
  alone?: boolean
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
  /** Which job of the set this is, and how many there are in it. */
  jobIndex: number
  jobCount: number
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
 * How fast `t` is gaining on the thing it is running at. Zero or less means
 * they are not really meeting - two halves of a cut that parted at the same
 * speed would otherwise hook straight back on.
 */
function closingSpeed(
  t: Train,
  ours: { heading: number },
  other: Train,
  theirs: { heading: number },
): number {
  const way = Math.sign(t.speed)
  const ux = Math.cos(ours.heading) * way
  const uz = Math.sin(ours.heading) * way
  const along = other.speed * (Math.cos(theirs.heading) * ux + Math.sin(theirs.heading) * uz)
  return Math.abs(t.speed) - along
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
    const closing = closingSpeed(t, ourEnd, other, metTheirFront ? oFront : oBack)
    if (closing <= 0) continue

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

    const rough = closing > TUNING.safeCouplingSpeed
    t.speed = 0
    // Nothing of the player's in it, so it is news rather than a jolt they felt.
    if (!hasLoco(t)) {
      say(w, 'the loose wagons buffered up')
    } else {
      say(
        w,
        rough ? 'coupled - but that was a thump' : 'coupled up',
        rough ? 'warn' : 'good',
      )
    }
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
  const index = Math.max(1, Math.min(t.cars.length - 1, w.cutAt))
  const rear = split(w.yard, t, index, `cut-${nextTrainId++}`)
  if (!rear) return
  w.trains.push(rear)
  w.cutAt = Math.max(1, Math.min(t.cars.length - 1, w.cutAt))
  const rolling = Math.abs(rear.speed) > 0
  say(w, `cut off ${rear.cars.length} behind${rolling ? ' - still rolling' : ''}`, 'good')
}

export function moveCut(w: World, delta: number): void {
  const t = playerTrain(w)
  if (!t) return
  w.cutAt = Math.max(1, Math.min(Math.max(1, t.cars.length - 1), w.cutAt + delta))
}

/**
 * Being stopped only happens on a tick where something was moving, and a cut
 * that is stopped stays stopped, so a loose cut says its piece exactly once.
 */
function reportBlock(w: World, blocked: Blocked, driven: boolean): void {
  if (blocked === 'buffer') {
    if (driven) say(w, 'buffer stop', 'warn')
    else say(w, 'the loose wagons ran into the buffer stop')
  } else if (blocked === 'switch-against') {
    if (driven) say(w, 'the points are set against you', 'warn')
    else say(w, 'the loose wagons stopped at the points')
  }
}

/** How far a car stands from the dead end of its own road - what "behind" means. */
function fromStop(y: Yard, t: Train, i: number): number {
  const span = carSpan(t, i)
  let remaining = (span.front + span.back) / 2
  for (const step of t.path) {
    const road = y.edges.get(step.edge)
    const len = road ? road.line.length : 0
    if (remaining <= len) {
      const at = step.forward ? remaining : len - remaining
      return road && y.nodes.get(road.to)?.kind === 'buffer' ? len - at : at
    }
    remaining -= len
  }
  return 0
}

/** One flag per goal, in the order the job sheet lists them. */
export function goalsMet(w: World): boolean[] {
  const y = w.yard
  const player = playerTrain(w)
  const met = w.job.goals.map(() => false)
  const spot = new Map<number, number>()

  w.job.goals.forEach((goal, g) => {
    for (const t of w.trains) {
      const i = t.cars.findIndex((c) => c.vehicle.id === goal.vehicleId)
      if (i < 0) continue
      // Still hooked to the loco means still in your hands, not delivered.
      if (t === player && !goal.alone) return
      if (goal.alone && t.cars.length !== 1) return
      if (carEdge(y, t, i) !== goal.edgeId) return
      met[g] = true
      spot.set(g, fromStop(y, t, i))
      return
    }
  })

  // Goals that share a road and carry a number have to stand in that sequence.
  const roads = new Map<string, number[]>()
  w.job.goals.forEach((goal, g) => {
    if (goal.order === undefined) return
    roads.set(goal.edgeId, [...(roads.get(goal.edgeId) ?? []), g])
  })
  for (const line of roads.values()) {
    if (!line.every((g) => met[g])) continue
    const sorted = [...line].sort((a, b) => (w.job.goals[a].order ?? 0) - (w.job.goals[b].order ?? 0))
    const jumbled = sorted.some((g, i) => i > 0 && (spot.get(g) ?? 0) <= (spot.get(sorted[i - 1]) ?? 0))
    if (jumbled) for (const g of line) met[g] = false
  }
  return met
}

export function checkJob(w: World): boolean {
  return goalsMet(w).every(Boolean)
}

function drive(t: Train, dt: number, controls: Controls): void {
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
}

/** Nobody is holding the brake on a loose cut - it just runs down and stands. */
function coast(t: Train, dt: number): void {
  const drop = TUNING.rollingResistance * dt
  t.speed = Math.abs(t.speed) <= drop ? 0 : t.speed - Math.sign(t.speed) * drop
}

function advance(w: World, t: Train, dt: number): void {
  if (t.speed === 0) return
  const forward = t.speed > 0
  const { blocked } = roll(w.yard, t, t.speed * dt)
  if (blocked) {
    t.speed = 0
    reportBlock(w, blocked, hasLoco(t))
    return
  }
  tryCouple(w, t, forward)
}

export function tick(w: World, dt: number, controls: Controls): void {
  w.time += dt
  const driven = playerTrain(w)
  if (driven) drive(driven, dt, controls)

  // Coupling swallows a train mid-loop, so work off a copy and skip the eaten.
  for (const t of [...w.trains]) {
    if (!w.trains.includes(t)) continue
    if (!hasLoco(t)) coast(t, dt)
    advance(w, t, dt)
  }

  // The loco may have ended the tick inside a different train than it started in.
  const player = playerTrain(w)
  if (player) w.cutAt = Math.max(1, Math.min(player.cars.length - 1, w.cutAt))

  if (!w.done && checkJob(w)) {
    w.done = true
    say(w, 'job done - the yard is clear', 'good')
  }
}
