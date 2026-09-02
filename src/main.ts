import { YARDS } from './content/yards/registry'
import { start } from './shell/GameLoop'

const canvas = document.getElementById('view') as HTMLCanvasElement
const hud = document.getElementById('hud') as HTMLElement

const world = YARDS[0].create()

// Dev only: lets a test driver read the yard state without a screenshot.
if (import.meta.env.DEV) (globalThis as Record<string, unknown>).world = world

start(world, canvas, hud)
