import type { World } from '../../sim/World'
import { CALDER_JOBS } from '../jobs/calder'
import { MARSDEN_JOBS } from '../jobs/marsden'
import { RIDLEY_JOBS } from '../jobs/ridley'
import { HALTON_JOBS, createLoopWorld } from './loopYard'
import { createWorld as createMarsden } from './smallYard'
import { createTriangleWorld } from './triangleYard'
import { createWharfWorld } from './wharfYard'

export interface Booking {
  yard: string
  create: () => World
}

/**
 * Every job you can be sent, in the order you get them. Which one he is up to
 * is written down by number, so new work goes on the end - reshuffling the list
 * would lose him his place.
 */
export const ROSTER: Booking[] = [
  ...MARSDEN_JOBS.map((_, i) => ({ yard: 'Marsden Yard', create: () => createMarsden(i) })),
  { yard: 'Halton Loop', create: () => createLoopWorld(0) },
  ...RIDLEY_JOBS.map((_, i) => ({ yard: 'Ridley Wharf', create: () => createWharfWorld(i) })),
  ...HALTON_JOBS.slice(1).map((_, i) => ({
    yard: 'Halton Loop',
    create: () => createLoopWorld(i + 1),
  })),
  ...CALDER_JOBS.map((_, i) => ({ yard: 'Calder Triangle', create: () => createTriangleWorld(i) })),
]

export function bookingAt(index: number): Booking {
  const n = ROSTER.length
  return ROSTER[((index % n) + n) % n]
}
