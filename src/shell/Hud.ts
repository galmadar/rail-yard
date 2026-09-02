import { goalsMet, lockedSwitches, playerTrain, type World } from '../sim/World'

function el(tag: string, cls: string, parent: HTMLElement): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  parent.appendChild(node)
  return node
}

/** Everything the driver needs to see, and nothing about the code underneath. */
export class Hud {
  private layer: HTMLElement
  private step: HTMLElement
  private job: HTMLElement
  private goals: HTMLElement
  private readout: HTMLElement
  private notice: HTMLElement
  private points: HTMLElement
  private done: HTMLElement

  constructor(root: HTMLElement) {
    // Its own layer, so swapping jobs can take the whole panel away in one go.
    this.layer = el('div', 'hud-layer', root)

    const panel = el('div', 'panel job-panel', this.layer)
    this.step = el('div', 'job-step', panel)
    this.job = el('h1', 'job-title', panel)
    this.goals = el('ul', 'goals', panel)

    const bottom = el('div', 'panel readout-panel', this.layer)
    this.readout = el('div', 'readout', bottom)
    this.points = el('div', 'points', bottom)

    this.notice = el('div', 'notice', this.layer)
    this.done = el('div', 'banner', this.layer)
  }

  destroy(): void {
    this.layer.remove()
  }

  update(world: World): void {
    this.step.textContent = `Job ${world.jobIndex + 1} of ${world.jobCount}`
    this.job.textContent = world.job.title

    this.goals.innerHTML = ''
    const met = goalsMet(world)
    world.job.goals.forEach((goal, g) => {
      let colour = '#888'
      for (const t of world.trains) {
        const car = t.cars.find((c) => c.vehicle.id === goal.vehicleId)
        if (car) colour = car.vehicle.colour
      }

      const row = document.createElement('li')
      row.className = met[g] ? 'goal done' : 'goal'

      const swatch = document.createElement('span')
      swatch.className = 'swatch'
      swatch.style.background = colour
      row.appendChild(swatch)

      const text = document.createElement('span')
      text.textContent = goal.text
      row.appendChild(text)

      const tick = document.createElement('span')
      tick.className = 'tick'
      tick.textContent = met[g] ? '✔' : ''
      row.appendChild(tick)

      this.goals.appendChild(row)
    })

    const t = playerTrain(world)
    if (t) {
      const locoCar = t.cars.find((c) => c.vehicle.kind === 'loco')
      const nose = locoCar && locoCar.reversed ? -1 : 1
      const facing = t.speed * nose
      const way = Math.abs(facing) < 0.05 ? 'standing' : facing > 0 ? 'forward' : 'back'
      const behind = t.cars.length - 1
      const cut = behind === 0 ? 'nothing on the hook' : `${behind} on the hook`
      const at = Math.max(1, Math.min(Math.max(1, t.cars.length - 1), world.cutAt))
      // The shunter can be on either end, so count the wagons it leaves behind.
      const locoAt = t.cars.findIndex((c) => c.vehicle.kind === 'loco')
      const dropping = locoAt < at ? t.cars.length - at : at
      const pin = behind === 0 ? '' : ` · U drops ${dropping}`
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

    this.done.className = world.done ? 'banner show' : 'banner'
    if (world.done) {
      this.done.textContent =
        world.jobIndex + 1 < world.jobCount
          ? 'Job done. Press N for the next one.'
          : "That's the lot. Press N to start again."
    }
  }
}
