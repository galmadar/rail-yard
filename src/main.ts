import { createWorld } from './content/yards/smallYard'
import { start, type Game } from './shell/GameLoop'

const hudRoot = document.getElementById('hud') as HTMLElement
let game: Game | null = null

/**
 * The scene is built once from the wagons it is given, and every job brings its
 * own, so changing job means a brand new canvas and a brand new scene.
 */
function freshCanvas(): HTMLCanvasElement {
  const old = document.getElementById('view') as HTMLCanvasElement | null
  const next = document.createElement('canvas')
  next.id = 'view'
  if (!old) {
    document.body.prepend(next)
    return next
  }
  // Hand the graphics card its memory back before the old canvas goes.
  const gl = (old.getContext('webgl2') ?? old.getContext('webgl')) as WebGLRenderingContext | null
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
  old.replaceWith(next)
  return next
}

function play(index: number): void {
  game?.stop()
  const world = createWorld(index)

  // Dev only: lets a test driver read the yard state without a screenshot.
  if (import.meta.env.DEV) (globalThis as Record<string, unknown>).world = world

  game = start(
    world,
    freshCanvas(),
    hudRoot,
    () => play((world.jobIndex + 1) % world.jobCount),
    () => play(world.jobIndex),
  )
}

// Dev only: jump straight to a job instead of working through them.
if (import.meta.env.DEV) (globalThis as Record<string, unknown>).playJob = play

play(0)
