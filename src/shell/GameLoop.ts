import * as THREE from 'three'
import { Renderer } from '../render/Renderer'
import { frontPose, noseWay } from '../sim/train'
import {
  moveCut,
  playerTrain,
  say,
  tick,
  tryThrowSwitch,
  uncouple,
  type Controls,
  type World,
} from '../sim/World'
import { Keyboard } from '../input/Keyboard'
import { Hud } from './Hud'
import { Steering, noseTowardsScreenRight } from './steering'
import { markPassed } from './progress'

const MAX_STEP = 1 / 30

/** About seventy degrees off the camera. Nearer than that and left is a guess. */

export interface Game {
  /** Stop the frames, drop the panel and let the old scene go. */
  stop: () => void
}

// One keyboard for the whole page - a second one would make every key fire twice.
let keyboard: Keyboard | null = null
let bound: string[] = []

function freshKeys(): Keyboard {
  if (!keyboard) keyboard = new Keyboard()
  for (const key of bound) keyboard.on(key, () => {})
  bound = []
  return keyboard
}

function bind(keys: Keyboard, key: string, action: () => void): void {
  keys.on(key, action)
  bound.push(key)
}

/**
 * The renderer hooks window resize for life and offers no way off, so catch
 * what it registers while it is being built and we can drop it later.
 */
function buildRenderer(
  canvas: HTMLCanvasElement,
  world: World,
): { renderer: Renderer; release: () => void } {
  const caught: { type: string; fn: EventListenerOrEventListenerObject }[] = []
  const original = window.addEventListener
  const real = original.bind(window)
  window.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
    caught.push({ type, fn })
    real(type, fn, opts as AddEventListenerOptions)
  }) as typeof window.addEventListener

  try {
    return {
      renderer: new Renderer(canvas, world),
      release: () => {
        for (const hook of caught) window.removeEventListener(hook.type, hook.fn)
      },
    }
  } finally {
    window.addEventListener = original
  }
}

export function start(
  world: World,
  canvas: HTMLCanvasElement,
  hudRoot: HTMLElement,
  onNext: () => void,
  onAgain: () => void,
  onPick: (index: number) => void,
): Game {
  const { renderer, release } = buildRenderer(canvas, world)
  const hud = new Hud(hudRoot, onPick)
  const keys = freshKeys()

  world.yard.switchOrder.forEach((id, i) => {
    bind(keys, String(i + 1), () => tryThrowSwitch(world, id))
  })
  bind(keys, 'u', () => uncouple(world))
  bind(keys, 'enter', () => uncouple(world))
  bind(keys, 'q', () => moveCut(world, -1))
  bind(keys, 'e', () => moveCut(world, 1))
  bind(keys, '[', () => moveCut(world, -1))
  bind(keys, ']', () => moveCut(world, 1))
  bind(keys, 'f', () => {
    const on = renderer.view.toggleFollow()
    say(world, on ? 'camera riding with the shunter' : 'camera parked')
  })
  bind(keys, 'n', () => {
    if (world.done) onNext()
    else say(world, 'finish this one first - R starts it over', 'warn')
  })
  bind(keys, 'r', onAgain)

  let previous = performance.now()
  let handle = 0
  let running = true

  const across = new THREE.Vector3()
  const steering = new Steering()

  /**
   * Which way to open the regulator for the Right arrow. He is asking for right
   * on the screen in front of him, and he can swing the camera round the yard,
   * so it can only come from where the camera is standing now.
   */
  function steerThrottle(steer: number): number {
    const t = playerTrain(world)
    if (!t) return 0
    across.setFromMatrixColumn(renderer.view.camera.matrixWorld, 0)
    const { heading } = frontPose(world.yard, t)
    const way = noseTowardsScreenRight(across.x, across.z, heading, noseWay(t))
    return steering.throttle(way, steer, t.speed)
  }

  function frame(now: number): void {
    if (!running) return
    const dt = Math.min(MAX_STEP, (now - previous) / 1000)
    previous = now

    const steer = (keys.down('arrowright') ? 1 : 0) + (keys.down('arrowleft') ? -1 : 0)
    const ahead = (keys.down('w', 'arrowup') ? 1 : 0) + (keys.down('s', 'arrowdown') ? -1 : 0)
    const controls: Controls = {
      throttle: Math.max(-1, Math.min(1, ahead + steerThrottle(steer))),
      brake: keys.down(' ', 'spacebar'),
    }

    if (controls.throttle !== 0) renderer.view.wake()
    tick(world, dt, controls)
    if (world.done) markPassed(world.jobIndex)
    hud.update(world)
    renderer.sync(world, dt)
    handle = requestAnimationFrame(frame)
  }

  handle = requestAnimationFrame(frame)

  return {
    stop(): void {
      running = false
      cancelAnimationFrame(handle)
      release()
      hud.destroy()
    },
  }
}
