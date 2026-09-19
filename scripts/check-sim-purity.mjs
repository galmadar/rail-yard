// The sim must never import three or touch the browser. If it does, the game
// logic is welded to the renderer and nothing here is testable in isolation.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const roots = ['src/sim', 'src/content']

const RULES = [
  // from/import/require/import() of 'three' or any 'three/...' subpath, any spacing.
  { name: 'imports three', strings: true, re: /\b(?:from|import|require)\s*\(?\s*['"`]three(?:\/[^'"`]*)?['"`]/ },
  { name: 'uses a DOM global', strings: false, re: /(?<![\w$.])(?:document|window|navigator)\s*\??\./ },
]

const TOKENS = /(['"`])(?:\\.|(?!\1)[^\\\n])*\1|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g

// Drop comments so prose like "three wagons" can't trip a rule; optionally empty strings too.
function strip(src, keepStrings) {
  return src.replace(TOKENS, (m, q) => (q ? (keepStrings ? m : q + q) : ''))
}

export function findViolations(src) {
  return RULES.filter((r) => r.re.test(strip(src, r.strings))).map((r) => r.name)
}

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, out)
    // No file here is exempt: drawing code lives in src/render, not beside the sim.
    else if (/\.[cm]?[jt]sx?$/.test(p)) {
      for (const v of findViolations(readFileSync(p, 'utf8'))) out.push(`${p}: ${v}`)
    }
  }
  return out
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const offenders = roots.flatMap((r) => walk(r, []))
  if (offenders.length) {
    console.error('sim purity violated:')
    for (const o of offenders) console.error('  ' + o)
    process.exit(1)
  }
  console.log('sim purity ok')
}
