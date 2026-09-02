import { Renderer } from '../render/Renderer'
import { moveCut, say, tick, tryThrowSwitch, uncouple, type Controls, type World } from '../sim/World'
import { Keyboard } from '../input/Keyboard'
import { Hud } from './Hud'

const MAX_STEP = 1 / 30

export function start(world: World, canvas: HTMLCanvasElement, hudRoot: HTMLElement): void {
  const renderer = new Renderer(canvas, world)
  const hud = new Hud(hudRoot)
  const keys = new Keyboard()

  world.yard.switchOrder.forEach((id, i) => {
    keys.on(String(i + 1), () => tryThrowSwitch(world, id))
  })
  keys.on('u', () => uncouple(world))
  keys.on('enter', () => uncouple(world))
  keys.on('q', () => moveCut(world, -1))
  keys.on('e', () => moveCut(world, 1))
  keys.on('[', () => moveCut(world, -1))
  keys.on(']', () => moveCut(world, 1))
  keys.on('f', () => {
    const on = renderer.view.toggleFollow()
    say(world, on ? 'camera riding with the shunter' : 'camera parked')
  })

  let previous = performance.now()

  function frame(now: number): void {
    const dt = Math.min(MAX_STEP, (now - previous) / 1000)
    previous = now

    const controls: Controls = {
      throttle: (keys.down('w', 'arrowup') ? 1 : 0) + (keys.down('s', 'arrowdown') ? -1 : 0),
      brake: keys.down(' ', 'spacebar'),
    }

    tick(world, dt, controls)
    hud.update(world)
    renderer.sync(world, dt)
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}
