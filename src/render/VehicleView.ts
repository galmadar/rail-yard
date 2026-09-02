import * as THREE from 'three'
import type { Vehicle } from '../sim/vehicles'

const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.6, metalness: 0.4 })
const FRAME_MAT = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.8 })
const BUFFER_MAT = new THREE.MeshStandardMaterial({ color: 0x33383d, roughness: 0.5, metalness: 0.5 })

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

/**
 * A vehicle you can tell apart at a glance from above: the shunter is dark with
 * a yellow end and a cab, the wagons are open boxes in their own colour.
 */
export function buildVehicle(v: Vehicle): THREE.Group {
  const g = new THREE.Group()

  const deck = new THREE.Mesh(new THREE.BoxGeometry(v.length, 0.35, v.width), FRAME_MAT)
  deck.position.y = 0.85
  deck.castShadow = true
  g.add(deck)

  g.add(wheelset(-0.3, v.length), wheelset(0.3, v.length))
  g.add(buffers(v, 1), buffers(v, -1))

  if (v.kind === 'loco') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: v.colour, roughness: 0.55 })
    const hood = new THREE.Mesh(new THREE.BoxGeometry(v.length * 0.52, 1.5, v.width * 0.78), bodyMat)
    hood.position.set(-v.length * 0.2, 1.8, 0)
    hood.castShadow = true
    g.add(hood)

    const cab = new THREE.Mesh(new THREE.BoxGeometry(v.length * 0.34, 2.3, v.width * 0.94), bodyMat)
    cab.position.set(v.length * 0.28, 2.2, 0)
    cab.castShadow = true
    g.add(cab)

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(v.length * 0.35, 0.85, v.width * 0.96),
      new THREE.MeshStandardMaterial({ color: 0x8fb6c9, roughness: 0.15, metalness: 0.3 }),
    )
    glass.position.set(v.length * 0.28, 2.9, 0)
    g.add(glass)

    // Yellow warning end - the bit you look for when you are deciding which way it faces.
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.4, v.width * 0.8),
      new THREE.MeshStandardMaterial({ color: 0xd8a417, roughness: 0.6 }),
    )
    nose.position.set(-v.length / 2 + 0.15, 1.8, 0)
    g.add(nose)
  } else {
    const bodyMat = new THREE.MeshStandardMaterial({ color: v.colour, roughness: 0.7 })
    const body = new THREE.Mesh(new THREE.BoxGeometry(v.length * 0.92, 2.0, v.width), bodyMat)
    body.position.y = 2.05
    body.castShadow = true
    g.add(body)

    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(v.length * 0.94, 0.18, v.width * 1.04),
      new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.8 }),
    )
    rim.position.y = 3.06
    g.add(rim)
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
