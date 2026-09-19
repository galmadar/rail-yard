// Re-records src/sim/feel.json from the sim as it plays now. Run it only once
// Gal has played the change and likes it: this is the sign-off, not a fix.
import { writeFileSync } from 'node:fs'
import { measureFeel } from '../src/sim/feel'

const out = new URL('../src/sim/feel.json', import.meta.url)
const feel = measureFeel()
writeFileSync(out, JSON.stringify(feel, null, 2) + '\n')
for (const v of Object.values(feel)) console.log(`${v.label}: ${v.value} ${v.unit}`)
console.log(`wrote ${out.pathname}`)
