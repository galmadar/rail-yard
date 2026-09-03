import * as THREE from 'three'
import type { Vehicle } from '../sim/vehicles'

const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.6, metalness: 0.4 })
const FRAME_MAT = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.8 })
const BUFFER_MAT = new THREE.MeshStandardMaterial({ color: 0x33383d, roughness: 0.5, metalness: 0.5 })
const IRON_MAT = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.75 })
const ROOF_MAT = new THREE.MeshStandardMaterial({ color: 0xb4b8ba, roughness: 0.7 })
const SLATE_MAT = new THREE.MeshStandardMaterial({ color: 0x4a5054, roughness: 0.85 })
const PLANK_MAT = new THREE.MeshStandardMaterial({ color: 0x7d5c37, roughness: 0.95 })
const LOG_MAT = new THREE.MeshStandardMaterial({ color: 0x9a6f3f, roughness: 0.95 })
const LOG_END_MAT = new THREE.MeshStandardMaterial({ color: 0xd8bd92, roughness: 0.9 })
const COAL_MAT = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 1 })
const ORE_MAT = new THREE.MeshStandardMaterial({ color: 0x8a4526, roughness: 1 })
const GLASS_MAT = new THREE.MeshStandardMaterial({ color: 0x8fb6c9, roughness: 0.15, metalness: 0.3 })

/** Top of the underframe. Everything a wagon carries stands on this. */
const DECK_TOP = 1.025

function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.castShadow = true
  return m
}

function wheelset(x: number, length: number): THREE.Group {
  const g = new THREE.Group()
  for (const z of [-0.78, 0.78]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 16), WHEEL_MAT)
    w.rotation.x = Math.PI / 2
    w.position.set(x * length, 0.5, z)
    g.add(w)
  }
  return g
}

function buffers(v: Vehicle, sign: number): THREE.Group {
  const g = new THREE.Group()
  for (const z of [-0.7, 0.7]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.5, 10), BUFFER_MAT)
    b.rotation.z = Math.PI / 2
    b.position.set(sign * (v.length / 2 + 0.2), 1.0, z)
    g.add(b)
  }
  return g
}

/** A planked floor in the wagon's own colour, for the ones with nothing on top. */
function deckFloor(v: Vehicle, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const floor = box(v.length * 0.96, 0.26, v.width, mat)
  floor.position.y = DECK_TOP + 0.13
  g.add(floor)
  for (const z of [-1.0, -0.33, 0.33, 1.0]) {
    const seam = box(v.length * 0.96, 0.3, 0.07, IRON_MAT)
    seam.position.set(0, DECK_TOP + 0.14, z)
    g.add(seam)
  }
  return g
}

function locoBody(v: Vehicle): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: v.colour, roughness: 0.55 })

  const hood = box(v.length * 0.52, 1.5, v.width * 0.78, mat)
  hood.position.set(v.length * 0.2, 1.8, 0)
  g.add(hood)

  const cab = box(v.length * 0.34, 2.3, v.width * 0.94, mat)
  cab.position.set(-v.length * 0.28, 2.2, 0)
  g.add(cab)

  const glass = box(v.length * 0.35, 0.85, v.width * 0.96, GLASS_MAT)
  glass.position.set(-v.length * 0.28, 2.9, 0)
  g.add(glass)

  // Yellow warning end - the bit you look for when you are deciding which way it faces.
  const nose = box(0.3, 1.4, v.width * 0.8, new THREE.MeshStandardMaterial({ color: 0xd8a417, roughness: 0.6 }))
  nose.position.set(v.length / 2 - 0.15, 1.8, 0)
  g.add(nose)

  return g
}

/** Closed, with a proper arc roof and a door in the middle of each side. */
function boxVan(v: Vehicle): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: v.colour, roughness: 0.7 })
  const len = v.length * 0.92

  const body = box(len, 2.1, v.width, mat)
  body.position.y = DECK_TOP + 1.05
  g.add(body)

  const roofGeo = new THREE.CylinderGeometry(v.width / 2, v.width / 2, len * 1.02, 18, 1, false)
  roofGeo.rotateZ(Math.PI / 2)
  const roof = new THREE.Mesh(roofGeo, ROOF_MAT)
  roof.scale.set(1, 0.62, 1)
  roof.position.y = DECK_TOP + 1.9
  roof.castShadow = true
  g.add(roof)

  const doorMat = new THREE.MeshStandardMaterial({ color: v.colour, roughness: 0.85 })
  doorMat.color.multiplyScalar(0.72)
  const door = box(2.3, 1.7, v.width + 0.08, doorMat)
  door.position.y = DECK_TOP + 0.95
  g.add(door)
  const seam = box(0.12, 1.7, v.width + 0.12, IRON_MAT)
  seam.position.y = DECK_TOP + 0.95
  g.add(seam)

  return g
}

/** A horizontal barrel on a saddle, with a filler hatch and a walkway on top. */
function tanker(v: Vehicle): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: v.colour, roughness: 0.3, metalness: 0.55 })
  const r = 1.35
  const len = v.length * 0.82
  const y = DECK_TOP + r + 0.12

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 22), mat)
  barrel.rotation.z = Math.PI / 2
  barrel.position.y = y
  barrel.castShadow = true
  g.add(barrel)

  for (const sign of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10), mat)
    cap.scale.set(0.42, 1, 1)
    cap.position.set((sign * len) / 2, y, 0)
    cap.castShadow = true
    g.add(cap)
  }

  // Bands and a saddle, so the barrel reads as sitting on the frame.
  for (const x of [-len * 0.3, len * 0.3]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(r + 0.03, 0.07, 6, 20), IRON_MAT)
    band.rotation.y = Math.PI / 2
    band.position.set(x, y, 0)
    g.add(band)
  }
  const saddle = box(len * 0.72, 0.5, v.width * 0.9, IRON_MAT)
  saddle.position.y = DECK_TOP + 0.2
  g.add(saddle)

  const walk = box(len * 0.5, 0.1, 0.8, IRON_MAT)
  walk.position.y = y + r - 0.05
  g.add(walk)
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.34, 14), IRON_MAT)
  hatch.position.y = y + r + 0.12
  hatch.castShadow = true
  g.add(hatch)
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 14), ROOF_MAT)
  lid.position.y = y + r + 0.32
  g.add(lid)

  return g
}

/** Sloped sides, open on top, heaped with whatever it carries. */
function hopper(v: Vehicle, loadMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color: v.colour,
    roughness: 0.75,
    side: THREE.DoubleSide,
  })
  const len = v.length * 0.9
  const h = 2.0
  const base = DECK_TOP + 0.1
  const top = base + h

  // A four-sided cylinder, turned so its flat faces square up with the wagon.
  const geo = new THREE.CylinderGeometry(1, 0.52, h, 4, 1, true)
  geo.rotateY(Math.PI / 4)
  const shell = new THREE.Mesh(geo, mat)
  const halfSide = Math.SQRT1_2
  shell.scale.set(len / 2 / halfSide, 1, v.width / 2 / halfSide)
  shell.position.y = base + h / 2
  shell.castShadow = true
  g.add(shell)

  for (const z of [-v.width / 2, v.width / 2]) {
    const bar = box(len + 0.12, 0.18, 0.2, IRON_MAT)
    bar.position.set(0, top, z)
    g.add(bar)
  }
  for (const x of [-len / 2, len / 2]) {
    const bar = box(0.2, 0.18, v.width + 0.12, IRON_MAT)
    bar.position.set(x, top, 0)
    g.add(bar)
  }

  const load = box(len * 0.9, 0.5, v.width * 0.86, loadMat)
  load.position.y = top - 0.3
  g.add(load)
  for (const x of [-len * 0.3, 0, len * 0.3]) {
    const heap = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), loadMat)
    heap.scale.set(len * 0.17, 0.34, v.width * 0.36)
    heap.rotation.y = x
    heap.position.set(x, top - 0.12, 0)
    heap.castShadow = true
    g.add(heap)
  }

  return g
}

/** A hut with an open veranda and a railing at each end. */
function brakeVan(v: Vehicle): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: v.colour, roughness: 0.8 })
  const cabLen = v.length * 0.48

  g.add(deckFloor(v, PLANK_MAT))

  const cab = box(cabLen, 2.0, v.width * 0.9, mat)
  cab.position.y = DECK_TOP + 1.26
  g.add(cab)

  // Slate, not the box van's light arc roof - the two must not read alike.
  const roof = box(cabLen + 0.5, 0.22, v.width * 1.0, SLATE_MAT)
  roof.position.y = DECK_TOP + 2.37
  roof.castShadow = true
  g.add(roof)

  // Windows on all four walls - the hut has to read as a hut from any angle.
  for (const z of [-1, 1]) {
    const w = box(cabLen * 0.6, 0.7, v.width * 0.92, GLASS_MAT)
    w.position.set(0, DECK_TOP + 1.75, z * 0.01)
    g.add(w)
  }
  for (const sign of [-1, 1]) {
    const w = box(cabLen * 0.92, 0.7, v.width * 0.5, GLASS_MAT)
    w.position.set(sign * 0.01, DECK_TOP + 1.75, 0)
    g.add(w)
  }

  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.75, 10), IRON_MAT)
  chimney.position.set(cabLen * 0.3, DECK_TOP + 2.8, v.width * 0.24)
  chimney.castShadow = true
  g.add(chimney)

  for (const sign of [-1, 1]) {
    const outer = sign * (v.length / 2 - 0.18)
    const inner = sign * (cabLen / 2 + 0.1)
    const railY = DECK_TOP + 1.05
    for (const z of [-1, 1]) {
      for (const x of [outer, inner]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 6), IRON_MAT)
        post.position.set(x, DECK_TOP + 0.62, z * (v.width / 2 - 0.14))
        g.add(post)
      }
      const side = box(Math.abs(outer - inner), 0.1, 0.1, IRON_MAT)
      side.position.set((outer + inner) / 2, railY, z * (v.width / 2 - 0.14))
      g.add(side)
    }
    const end = box(0.1, 0.1, v.width - 0.28, IRON_MAT)
    end.position.set(outer, railY, 0)
    g.add(end)
  }

  return g
}

/** A flat with stakes down both sides and a load of logs between them. */
function timber(v: Vehicle): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: v.colour, roughness: 0.85 })
  g.add(deckFloor(v, mat))

  for (const x of [-2.4, -0.8, 0.8, 2.4]) {
    for (const z of [-1, 1]) {
      const stake = box(0.22, 1.9, 0.22, IRON_MAT)
      stake.position.set(x, DECK_TOP + 1.2, z * (v.width / 2 + 0.02))
      g.add(stake)
    }
  }

  const logLen = v.length * 0.94
  const rows: Array<[number, number[]]> = [
    [DECK_TOP + 0.72, [-0.86, 0, 0.86]],
    [DECK_TOP + 1.44, [-0.45, 0.45]],
  ]
  for (const [y, zs] of rows) {
    for (const z of zs) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, logLen, 12), LOG_MAT)
      log.rotation.z = Math.PI / 2
      log.position.set(0, y, z)
      log.castShadow = true
      g.add(log)
      for (const sign of [-1, 1]) {
        const cut = new THREE.Mesh(new THREE.CircleGeometry(0.44, 12), LOG_END_MAT)
        cut.rotation.y = (sign * Math.PI) / 2
        cut.position.set((sign * logLen) / 2 + sign * 0.01, y, z)
        g.add(cut)
      }
    }
  }

  return g
}

/** The wagon's name on a small board floating over it, readable from up high. */
function nameBoard(text: string, height: number): THREE.Sprite {
  const h = 150
  const font = '600 66px "Avenir Next", Verdana, sans-serif'
  const pad = 26

  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = font
  const w = Math.ceil(measure.measureText(text).width) + pad * 2

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d')!

  g.fillStyle = 'rgba(18,22,26,0.88)'
  g.strokeStyle = '#e8e3d8'
  g.lineWidth = 6
  const r = 24
  g.beginPath()
  g.moveTo(r, 3)
  g.arcTo(w - 3, 3, w - 3, h - 3, r)
  g.arcTo(w - 3, h - 3, 3, h - 3, r)
  g.arcTo(3, h - 3, 3, 3, r)
  g.arcTo(3, 3, w - 3, 3, r)
  g.closePath()
  g.fill()
  g.stroke()

  g.fillStyle = '#f6f3ec'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = font
  g.fillText(text, w / 2, h / 2 + 4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true }))
  sprite.scale.set((height * w) / h, height, 1)
  return sprite
}

export interface LabelStyle {
  /** World height of the board. Bigger yards need bigger boards. */
  height: number
  /** How far above the rails it floats. */
  lift: number
}

/**
 * A vehicle you can tell apart at a glance from above, by shape before colour:
 * a barrel is a tanker, a heaped tub is a hopper, a hut on a frame is the brake
 * van. The name floats over it as well, so the job sheet reads straight off.
 */
export function buildVehicle(v: Vehicle, label?: LabelStyle): THREE.Group {
  const g = new THREE.Group()

  const deck = new THREE.Mesh(new THREE.BoxGeometry(v.length, 0.35, v.width), FRAME_MAT)
  deck.position.y = 0.85
  deck.castShadow = true
  g.add(deck)

  g.add(wheelset(-0.3, v.length), wheelset(0.3, v.length))
  g.add(buffers(v, 1), buffers(v, -1))

  switch (v.body) {
    case 'loco':
      g.add(locoBody(v))
      break
    case 'tanker':
      g.add(tanker(v))
      break
    case 'coal-hopper':
      g.add(hopper(v, COAL_MAT))
      break
    case 'ore-hopper':
      g.add(hopper(v, ORE_MAT))
      break
    case 'brake-van':
      g.add(brakeVan(v))
      break
    case 'timber':
      g.add(timber(v))
      break
    case 'flat':
      g.add(deckFloor(v, new THREE.MeshStandardMaterial({ color: v.colour, roughness: 0.85 })))
      break
    default:
      g.add(boxVan(v))
  }

  if (label) {
    const board = nameBoard(v.name.replace(/^the /, ''), label.height)
    board.position.y = label.lift
    g.add(board)
  }

  return g
}

/** A ring on the ground under the wagon the job sheet is talking about. */
export function buildHighlight(): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 3.2, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.08
  return ring
}

/** The pin: a gold marker hanging over the coupling that U will break. */
export function buildPin(): THREE.Group {
  const g = new THREE.Group()
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd24a })

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 4), gold)
  head.rotation.y = Math.PI / 4
  head.rotation.x = Math.PI
  head.position.y = 4.9
  g.add(head)

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 6), gold)
  shaft.position.y = 6.3
  g.add(shaft)

  const cut = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 2.6, 3.6),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.45 }),
  )
  cut.position.y = 1.9
  g.add(cut)

  return g
}
