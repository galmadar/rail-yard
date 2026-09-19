import { straight } from './geometry'
import { loco, wagon } from './vehicles'
import type { Train } from './train'
import { TUNING } from './tuning'
import { playerTrain, tick, uncouple, type Controls, type World } from './World'
import type { Edge, Yard, YardNode } from './yard'

/**
 * The handful of numbers that decide how driving and coupling feel, measured by
 * really driving the sim. `feel.test.ts` fails when one drifts from `feel.json`.
 */
export interface FeelValue {
  /** What it means, in the player's words. */
  label: string
  value: number
  unit: string
  /** Allowed drift either way, as a fraction: 0.05 is ±5%. */
  tolerance: number
  kind: 'measured' | 'constant'
}

export type Feel = Record<string, FeelValue>

// Fixed tick so every run is the same; the game itself runs at up to 1/30.
const DT = 1 / 60
const FULL: Controls = { throttle: 1, brake: false }
const LET_GO: Controls = { throttle: 0, brake: false }
const BRAKE: Controls = { throttle: 0, brake: true }

/** One dead-straight road, long enough that nothing reaches a buffer stop. */
function testTrack(): Yard {
  return {
    nodes: new Map<string, YardNode>([
      ['end-a', { kind: 'buffer', id: 'end-a', edge: 'road' }],
      ['end-b', { kind: 'buffer', id: 'end-b', edge: 'road' }],
    ]),
    edges: new Map<string, Edge>([
      ['road', { id: 'road', name: 'the test road', from: 'end-a', to: 'end-b', line: straight({ x: 0, z: 0 }, { x: 3000, z: 0 }) }],
    ]),
    switchOrder: [],
    signs: [],
  }
}

function cut(id: string, kinds: ('loco' | 'wagon')[], head: number, speed = 0): Train {
  return {
    id,
    cars: kinds.map((k, i) => ({
      vehicle: k === 'loco' ? loco('shunter') : wagon(`wagon-${i}`, 'the wagon', '#888888'),
      reversed: false,
    })),
    path: [{ edge: 'road', forward: true }],
    head,
    speed,
  }
}

function world(trains: Train[]): World {
  return {
    yard: testTrack(),
    trains,
    job: { title: 'feel', goals: [] },
    jobIndex: 0,
    jobCount: 1,
    time: 0,
    notice: null,
    cutAt: 1,
    done: false,
  }
}

/** Run until `stop` says so. Throws rather than hang if the sim never gets there. */
function runUntil(w: World, controls: Controls, stop: () => boolean): number {
  for (let i = 1; i <= 60 * 600; i++) {
    tick(w, DT, controls)
    if (stop()) return i
  }
  throw new Error('feel measurement never finished')
}

function secondsToTopSpeed(): number {
  const w = world([cut('player', ['loco'], 50)])
  const t = playerTrain(w)!
  return runUntil(w, FULL, () => t.speed >= TUNING.maxSpeed) * DT
}

function topSpeedKmh(): number {
  const w = world([cut('player', ['loco'], 50)])
  runUntil(w, FULL, () => w.time >= 5)
  return playerTrain(w)!.speed * 3.6
}

/** Metres covered from full speed until it stands, under `controls`. */
function runOut(controls: Controls): number {
  const w = world([cut('player', ['loco'], 50, TUNING.maxSpeed)])
  const t = playerTrain(w)!
  runUntil(w, controls, () => t.speed === 0)
  return t.head - 50
}

/** Shove a wagon at 10 m/s, pull the pin, brake the loco: how far the wagon runs. */
function kickedWagonRun(): number {
  const w = world([cut('player', ['wagon', 'loco'], 50, 10)])
  uncouple(w)
  const loose = w.trains.find((t) => t !== playerTrain(w))!
  const from = loose.head
  runUntil(w, BRAKE, () => loose.speed === 0)
  return loose.head - from
}

/** Does buffering up to a standing wagon at `speed` m/s count as gentle? */
function gentleAt(speed: number): boolean {
  const w = world([cut('player', ['loco'], 50, speed), cut('wagon', ['wagon'], 60)])
  // Regulator set to hold exactly this speed until the buffers meet.
  const hold: Controls = { throttle: speed / TUNING.maxSpeed, brake: false }
  runUntil(w, hold, () => playerTrain(w)!.cars.length > 1)
  return w.notice?.tone === 'good'
}

/** The fastest buffering-up that still just says "coupled up", to the nearest 0.05 m/s. */
function gentleCouplingLimit(): number {
  let best = 0
  for (let i = 1; i <= 400; i++) {
    const speed = i / 20
    if (!gentleAt(speed)) break
    best = speed
  }
  return best * 3.6
}

const round = (n: number): number => Math.round(n * 1000) / 1000

/** Everything the feel guard watches, freshly measured. */
export function measureFeel(): Feel {
  const tol = 0.05
  const feel: Feel = {
    topSpeed: { label: 'top speed of the shunter', value: topSpeedKmh(), unit: 'km/h', tolerance: tol, kind: 'measured' },
    secondsToTopSpeed: { label: 'time to reach top speed from a stand, flat out', value: secondsToTopSpeed(), unit: 's', tolerance: tol, kind: 'measured' },
    stoppingDistance: { label: 'stopping distance from full speed, brake held', value: runOut(BRAKE), unit: 'm', tolerance: tol, kind: 'measured' },
    coastingDistance: { label: 'how far the shunter rolls from full speed when you let go of everything', value: runOut(LET_GO), unit: 'm', tolerance: tol, kind: 'measured' },
    kickedWagonRun: { label: 'how far a wagon runs on its own after being kicked off at 36 km/h', value: kickedWagonRun(), unit: 'm', tolerance: tol, kind: 'measured' },
    gentleCouplingLimit: { label: 'fastest you can buffer up and still get "coupled up", not "a thump"', value: gentleCouplingLimit(), unit: 'km/h', tolerance: tol, kind: 'measured' },
    couplingReach: { label: 'how close the buffers must get before they hook on', value: TUNING.couplingReach, unit: 'm', tolerance: tol, kind: 'constant' },
  }
  for (const v of Object.values(feel)) v.value = round(v.value)
  return feel
}

/** One plain sentence per value that moved outside its allowance. Empty means the feel held. */
export function feelDrift(recorded: Feel, now: Feel): string[] {
  const out: string[] = []
  for (const [key, was] of Object.entries(recorded)) {
    const is = now[key]
    if (!is) {
      out.push(`The feel guard lost track of "${was.label}".`)
      continue
    }
    const allowed = Math.abs(was.value) * was.tolerance
    if (Math.abs(is.value - was.value) > allowed + 1e-9) {
      const pct = Math.round(was.tolerance * 100)
      out.push(
        `The feel changed: ${was.label} went from ${fmt(was.value, was.value)} to ${fmt(is.value, was.value)} ${was.unit} (allowed ±${pct}%).`,
      )
    }
  }
  for (const [key, is] of Object.entries(now)) {
    if (!recorded[key]) out.push(`The feel guard has a new measurement nobody has signed off: "${is.label}".`)
  }
  return out
}

// Both numbers at the same precision, set by the recorded one.
const fmt = (n: number, scale: number): string => n.toFixed(Math.abs(scale) >= 10 ? 1 : 2)
