const KEY = 'rail-yard.passed'

function load(): Set<number> {
  try {
    const raw = localStorage.getItem(KEY)
    // Gal finished the first job before any of this was being written down.
    return new Set(raw ? (JSON.parse(raw) as number[]) : [0])
  } catch {
    return new Set([0])
  }
}

const passed = load()

export function isPassed(index: number): boolean {
  return passed.has(index)
}

/** You can go back to anything you have passed, and forward one step past it. */
export function isOpen(index: number): boolean {
  return index === 0 || passed.has(index) || passed.has(index - 1)
}

export function markPassed(index: number): void {
  if (passed.has(index)) return
  passed.add(index)
  try {
    localStorage.setItem(KEY, JSON.stringify([...passed]))
  } catch {
    // A private window just forgets between visits. Not worth a fuss.
  }
}
