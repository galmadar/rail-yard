import * as THREE from 'three'
import type { Polyline } from '../sim/geometry'

/** Unit sideways vector at each point of a polyline, averaged across corners. */
function normals(line: Polyline): { nx: number[]; nz: number[] } {
  const nx: number[] = []
  const nz: number[] = []
  const pts = line.points
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz) || 1
    nx.push(-dz / len)
    nz.push(dx / len)
  }
  return { nx, nz }
}

/** A flat strip laid along the track: ballast bed, a rail, a road surface. */
export function ribbon(line: Polyline, halfWidth: number, y: number, offset = 0): THREE.BufferGeometry {
  const { nx, nz } = normals(line)
  const pts = line.points
  const position: number[] = []
  const uv: number[] = []
  const index: number[] = []

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const l = offset + halfWidth
    const r = offset - halfWidth
    position.push(p.x + nx[i] * l, y, p.z + nz[i] * l)
    position.push(p.x + nx[i] * r, y, p.z + nz[i] * r)
    const v = line.cumulative[i]
    uv.push(0, v, 1, v)
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}
