import { describe, expect, it } from 'vitest'
import { createWorld } from '../content/yards/smallYard'
import { MARSDEN_JOBS } from '../content/jobs/marsden'
import { ROSTER } from '../content/yards/registry'
import { checkJob, goalsMet, type World } from './World'
import type { Car } from './train'

interface Placement {
  edge: string
  /** Vehicle ids from the far end of the road back towards the points. */
  ids: string[]
  head: number
}

/** Stand the same vehicles somewhere else, as if the job had been worked. */
function stand(w: World, spec: Placement[]): void {
  const cars = new Map<string, Car>()
  for (const t of w.trains) for (const c of t.cars) cars.set(c.vehicle.id, c)
  w.trains = spec.map((s, i) => ({
    id: `set-${i}`,
    cars: s.ids.map((id) => cars.get(id)!),
    path: [{ edge: s.edge, forward: true }],
    head: s.head,
    speed: 0,
  }))
}

const FINISHED: Placement[][] = [
  [
    { edge: 'headshunt', ids: ['shunter'], head: 55 },
    { edge: 'goods-road', ids: ['van'], head: 95 },
    { edge: 'oil-road', ids: ['tanker'], head: 85 },
    { edge: 'coal-road', ids: ['hopper'], head: 70 },
  ],
  [
    { edge: 'headshunt', ids: ['shunter'], head: 55 },
    { edge: 'goods-road', ids: ['van', 'tanker', 'hopper'], head: 110 },
  ],
  [
    { edge: 'headshunt', ids: ['shunter'], head: 55 },
    { edge: 'goods-road', ids: ['van', 'brake'], head: 110 },
    { edge: 'oil-road', ids: ['tanker'], head: 90 },
    { edge: 'coal-road', ids: ['hopper', 'flat'], head: 70 },
  ],
]

describe('the job sheet', () => {
  it('only asks for wagons that are actually in the yard', () => {
    MARSDEN_JOBS.forEach((setup, i) => {
      const there = new Set(setup.layout().flatMap((t) => t.cars.map((c) => c.vehicle.id)))
      for (const goal of setup.job.goals) {
        expect(there.has(goal.vehicleId), `job ${i + 1} asks for ${goal.vehicleId}`).toBe(true)
      }
    })
  })

  it('never starts a job already finished', () => {
    MARSDEN_JOBS.forEach((_, i) => {
      const w = createWorld(i)
      expect(checkJob(w), `job ${i + 1} starts done`).toBe(false)
      expect(w.done).toBe(false)
    })
  })

  // A tick before the player has touched anything means the goal is asking for
  // nothing - either it is worded wrong or it belongs at the end of the job.
  it('never starts a job with a tick already on the sheet', () => {
    ROSTER.forEach((booking, i) => {
      const w = booking.create()
      goalsMet(w).forEach((met, g) => {
        expect(met, `job ${i + 1} starts with "${w.job.goals[g].text}" done`).toBe(false)
      })
    })
  })

  it('says done once every wagon is where the sheet asked', () => {
    MARSDEN_JOBS.forEach((_, i) => {
      const w = createWorld(i)
      stand(w, FINISHED[i])
      expect(checkJob(w), `job ${i + 1} does not finish`).toBe(true)
    })
  })

  it('knows which job of the set you are on', () => {
    MARSDEN_JOBS.forEach((setup, i) => {
      const w = createWorld(i)
      expect(w.jobIndex).toBe(i)
      expect(w.jobCount).toBe(MARSDEN_JOBS.length)
      expect(w.job.title).toBe(setup.job.title)
    })
  })

  it('is not fooled by the right wagons standing in the wrong order', () => {
    const w = createWorld(1)
    stand(w, [
      { edge: 'headshunt', ids: ['shunter'], head: 55 },
      { edge: 'goods-road', ids: ['hopper', 'tanker', 'van'], head: 110 },
    ])
    expect(checkJob(w)).toBe(false)
    expect(goalsMet(w)).toEqual([false, false, false])
  })

  it('will not let the shunter go home still coupled to something', () => {
    const w = createWorld(2)
    stand(w, [
      { edge: 'headshunt', ids: ['shunter', 'flat'], head: 55 },
      { edge: 'goods-road', ids: ['van', 'brake'], head: 110 },
      { edge: 'oil-road', ids: ['tanker'], head: 90 },
      { edge: 'coal-road', ids: ['hopper'], head: 70 },
    ])
    expect(checkJob(w)).toBe(false)
  })

  it('does not tick going home until the wagons are all placed', () => {
    const w = createWorld(2)
    stand(w, [
      { edge: 'headshunt', ids: ['shunter'], head: 55 },
      { edge: 'goods-road', ids: ['van', 'brake'], head: 110 },
      { edge: 'spare', ids: ['tanker'], head: 60 },
      { edge: 'coal-road', ids: ['hopper', 'flat'], head: 70 },
    ])
    expect(goalsMet(w).at(-1)).toBe(false)

    stand(w, FINISHED[2])
    expect(goalsMet(w).at(-1)).toBe(true)
  })
})
