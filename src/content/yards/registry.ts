import type { World } from '../../sim/World'
import { MARSDEN_JOBS } from '../jobs/marsden'
import { RIDLEY_JOBS } from '../jobs/ridley'
import { createLoopWorld } from './loopYard'
import { createWorld as createMarsden } from './smallYard'
import { createWharfWorld } from './wharfYard'

export interface Booking {
  yard: string
  create: () => World
}

/** Every job you can be sent, in the order you get them. */
export const ROSTER: Booking[] = [
  ...MARSDEN_JOBS.map((_, i) => ({ yard: 'Marsden Yard', create: () => createMarsden(i) })),
  { yard: 'Halton Loop', create: createLoopWorld },
  ...RIDLEY_JOBS.map((_, i) => ({ yard: 'Ridley Wharf', create: () => createWharfWorld(i) })),
]

export function bookingAt(index: number): Booking {
  const n = ROSTER.length
  return ROSTER[((index % n) + n) % n]
}
