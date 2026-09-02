import { createWorld } from './content/yards/smallYard'
import { start } from './shell/GameLoop'

const canvas = document.getElementById('view') as HTMLCanvasElement
const hud = document.getElementById('hud') as HTMLElement

const world = createWorld()

// Dev only: lets a test driver read the yard state without a screenshot.
if (import.meta.env.DEV) (globalThis as Record<string, unknown>).world = world

start(world, canvas, hud)
