import { describe, expect, it } from 'vitest'
import { feelDrift, measureFeel, type Feel } from './feel'

// Globbed rather than imported: the tsconfig has no JSON modules.
const recorded = Object.values(
  import.meta.glob<Feel>('./feel.json', { eager: true, import: 'default' }),
)[0]

describe('how driving and coupling feel', () => {
  it('has not drifted from what Gal last played', () => {
    expect(recorded, 'src/sim/feel.json is missing. Run npm run feel:snapshot.').toBeDefined()
    const drift = feelDrift(recorded!, measureFeel())
    if (drift.length) {
      throw new Error(
        [
          ...drift,
          'Gal has to play this before it ships. If he likes it, run npm run feel:snapshot.',
        ].join('\n'),
      )
    }
  })
})
