import type { World } from '../../sim/World'
import { MARSDEN_JOBS } from '../jobs/marsden'
import { createLoopWorld } from './loopYard'
import { createWorld as createMarsden } from './smallYard'

export interface Booking {
  yard: string
  create: () => World
}

/** Every job you can be sent, in the order you get them. */
export const ROSTER: Booking[] = [
  ...MARSDEN_JOBS.map((_, i) => ({ yard: 'Marsden Yard', create: () => createMarsden(i) })),
  { yard: 'Halton Loop', create: createLoopWorld },
]

export function bookingAt(index: number): Booking {
  const n = ROSTER.length
  return ROSTER[((index % n) + n) % n]
}
