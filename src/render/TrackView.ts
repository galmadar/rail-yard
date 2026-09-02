import * as THREE from 'three'
import { poseAt } from '../sim/geometry'
import type { Yard } from '../sim/yard'
import { ribbon } from './ribbon'

const SLEEPER_SPACING = 0.85
const GAUGE = 1.5

/** Ballast, sleepers and rails for the whole yard, built once and left alone. */
export function buildTrack(yard: Yard): THREE.Group {
  const group = new THREE.Group()

  const ballastMat = new THREE.MeshStandardMaterial({ color: 0x6d6459, roughness: 1 })
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.35, metalness: 0.8 })

  let sleeperCount = 0
  for (const e of yard.edges.values()) sleeperCount += Math.floor(e.line.length / SLEEPER_SPACING) + 1

  const sleeperGeo = new THREE.BoxGeometry(0.26, 0.16, 2.5)
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 1 })
  const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount)
  sleepers.receiveShadow = true
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const one = new THREE.Vector3(1, 1, 1)
  let n = 0

  for (const e of yard.edges.values()) {
    const ballast = new THREE.Mesh(ribbon(e.line, 2.3, 0.03), ballastMat)
    ballast.receiveShadow = true
    group.add(ballast)

    for (const side of [GAUGE / 2, -GAUGE / 2]) {
      const rail = new THREE.Mesh(ribbon(e.line, 0.07, 0.28, side), railMat)
      group.add(rail)
    }

    for (let s = 0; s <= e.line.length; s += SLEEPER_SPACING) {
      const p = poseAt(e.line, s)
      q.setFromAxisAngle(up, -p.heading)
      m.compose(new THREE.Vector3(p.x, 0.12, p.z), q, one)
      sleepers.setMatrixAt(n++, m)
    }
  }
  sleepers.count = n
  group.add(sleepers)

  // Buffer stops: a red baulk of timber across the rails at every dead end.
  const stopMat = new THREE.MeshStandardMaterial({ color: 0x9c3b2e, roughness: 0.8 })
  for (const node of yard.nodes.values()) {
    if (node.kind !== 'buffer') continue
    const e = yard.edges.get(node.edge)!
    const atStart = e.from === node.id
    const p = poseAt(e.line, atStart ? 0.5 : e.line.length - 0.5)
    const stop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 2.8), stopMat)
    stop.position.set(p.x, 0.75, p.z)
    stop.rotation.y = -p.heading
    stop.castShadow = true
    group.add(stop)
  }

  return group
}

export interface SwitchMarker {
  id: string
  lever: THREE.Mesh
  lamp: THREE.Mesh
}

/** A lever and a lamp beside each set of points, so you can read the road. */
export function buildSwitchMarkers(yard: Yard): { group: THREE.Group; markers: SwitchMarker[] } {
  const group = new THREE.Group()
  const markers: SwitchMarker[] = []
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.7 })

  for (const id of yard.switchOrder) {
    const node = yard.nodes.get(id)
    if (!node || node.kind !== 'switch') continue
    const toe = yard.edges.get(node.toe)!
    const at = toe.to === id ? toe.line.length : 0
    const p = poseAt(toe.line, at)

    const stand = new THREE.Group()
    stand.position.set(p.x, 0, p.z + 3.2)

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.2, 8), postMat)
    post.position.y = 0.6
    stand.add(post)

    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), postMat)
    lever.position.y = 1.35
    stand.add(lever)

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000, roughness: 0.4 }),
    )
    lamp.position.y = 2.0
    stand.add(lamp)

    group.add(stand)
    markers.push({ id, lever, lamp })
  }

  return { group, markers }
}
