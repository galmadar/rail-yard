import { carEdge } from '../sim/train'
import { lockedSwitches, playerTrain, type World } from '../sim/World'

function el(tag: string, cls: string, parent: HTMLElement): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  parent.appendChild(node)
  return node
}

/** Everything the driver needs to see, and nothing about the code underneath. */
export class Hud {
  private job: HTMLElement
  private goals: HTMLElement
  private readout: HTMLElement
  private notice: HTMLElement
  private points: HTMLElement
  private done: HTMLElement

  constructor(root: HTMLElement) {
    const panel = el('div', 'panel job-panel', root)
    this.job = el('h1', 'job-title', panel)
    this.goals = el('ul', 'goals', panel)

    const bottom = el('div', 'panel readout-panel', root)
    this.readout = el('div', 'readout', bottom)
    this.points = el('div', 'points', bottom)

    this.notice = el('div', 'notice', root)
    this.done = el('div', 'done', root)
  }

  update(world: World): void {
    this.job.textContent = world.job.title

    this.goals.innerHTML = ''
    const player = playerTrain(world)
    for (const goal of world.job.goals) {
      let placed = false
      let colour = '#888'
      for (const t of world.trains) {
        const i = t.cars.findIndex((c) => c.vehicle.id === goal.vehicleId)
        if (i < 0) continue
        colour = t.cars[i].vehicle.colour
        if (t !== player && carEdge(world.yard, t, i) === goal.edgeId) placed = true
      }

      const row = document.createElement('li')
      row.className = placed ? 'goal done' : 'goal'

      const swatch = document.createElement('span')
      swatch.className = 'swatch'
      swatch.style.background = colour
      row.appendChild(swatch)

      const text = document.createElement('span')
      text.textContent = goal.text
      row.appendChild(text)

      const tick = document.createElement('span')
      tick.className = 'tick'
      tick.textContent = placed ? '✔' : ''
      row.appendChild(tick)

      this.goals.appendChild(row)
    }

    const t = playerTrain(world)
    if (t) {
      const locoCar = t.cars.find((c) => c.vehicle.kind === 'loco')
      const nose = locoCar && locoCar.reversed ? -1 : 1
      const facing = t.speed * nose
      const way = Math.abs(facing) < 0.05 ? 'standing' : facing > 0 ? 'forward' : 'back'
      const behind = t.cars.length - 1
      const cut = behind === 0 ? 'nothing on the hook' : `${behind} on the hook`
      const at = Math.max(1, Math.min(Math.max(1, t.cars.length - 1), world.cutAt))
      const dropping = t.cars.length - at
      const pin = behind === 0 ? '' : ` · U drops the back ${dropping}`
      this.readout.textContent =
        `${Math.abs(t.speed).toFixed(1)} m/s ${way} · ${cut}${pin}`
    }

    const locked = lockedSwitches(world)
    this.points.innerHTML = ''
    world.yard.switchOrder.forEach((id, i) => {
      const node = world.yard.nodes.get(id)
      if (!node || node.kind !== 'switch') return
      const chip = document.createElement('span')
      const road = world.yard.edges.get(node.state === 'straight' ? node.straight : node.diverge)
      chip.className = `chip ${node.state}${locked.has(id) ? ' locked' : ''}`
      chip.textContent = `${i + 1} → ${road ? road.name : node.state}`
      this.points.appendChild(chip)
    })

    if (world.notice && world.time - world.notice.at < 3.2) {
      this.notice.textContent = world.notice.text
      this.notice.className = `notice show ${world.notice.tone}`
    } else {
      this.notice.className = 'notice'
    }

    this.done.className = world.done ? 'done show' : 'done'
    if (world.done) this.done.textContent = 'Yard sorted. Nice work.'
  }
}
