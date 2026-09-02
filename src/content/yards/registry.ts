import type { World } from '../../sim/World'
import { createWorld as createSmallYard } from './smallYard'
import { createLoopWorld } from './loopYard'

export interface YardEntry {
  id: string
  name: string
  create: () => World
}

/** Every yard you can be sent to work. */
export const YARDS: YardEntry[] = [
  { id: 'marsden', name: 'Marsden Yard', create: createSmallYard },
  { id: 'halton', name: 'Halton Loop', create: createLoopWorld },
]

export function yardById(id: string): YardEntry {
  return YARDS.find((y) => y.id === id) ?? YARDS[0]
}
