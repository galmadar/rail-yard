import * as THREE from 'three'
import { poseAt } from '../sim/geometry'
import type { Yard } from '../sim/yard'

function board(text: string, colour: string | null): THREE.Sprite {
  const h = 168
  const font = '600 62px "Avenir Next", Verdana, sans-serif'
  const pad = 40
  const chip = colour ? 100 : 0

  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = font
  const w = Math.ceil(measure.measureText(text).width) + chip + pad * 2

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d')!

  g.fillStyle = '#161b1f'
  g.strokeStyle = '#e8e3d8'
  g.lineWidth = 8
  const r = 26
  g.beginPath()
  g.moveTo(r, 4)
  g.arcTo(w - 4, 4, w - 4, h - 4, r)
  g.arcTo(w - 4, h - 4, 4, h - 4, r)
  g.arcTo(4, h - 4, 4, 4, r)
  g.arcTo(4, 4, w - 4, 4, r)
  g.closePath()
  g.fill()
  g.stroke()

  if (colour) {
    g.fillStyle = colour
    g.beginPath()
    g.arc(pad + 30, h / 2, 30, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(0,0,0,0.5)'
    g.lineWidth = 4
    g.stroke()
  }

  g.fillStyle = '#f2efe8'
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  g.font = font
  g.fillText(text, pad + chip, h / 2 + 4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true }))
  const height = 3.0
  sprite.scale.set((height * w) / h, height, 1)
  return sprite
}

/**
 * A name board beside every road, with the colour of the wagon that belongs
 * there, so you can pick your road without counting sidings.
 */
export function buildRoadSigns(yard: Yard, wanted: Map<string, string>): THREE.Group {
  const group = new THREE.Group()
  const postMat = new THREE.MeshStandardMaterial({ color: 0x30353a, roughness: 0.8 })

  for (const { edge, at } of yard.signs) {
    const e = yard.edges.get(edge)
    if (!e) continue
    const p = poseAt(e.line, e.line.length * at)
    const nx = -Math.sin(p.heading)
    const nz = Math.cos(p.heading)
    const x = p.x + nx * 7
    const z = p.z + nz * 7

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 4.2, 8), postMat)
    post.position.set(x, 2.1, z)
    post.castShadow = true
    group.add(post)

    const sign = board(e.name, wanted.get(edge) ?? null)
    sign.position.set(x, 5.6, z)
    group.add(sign)
  }

  return group
}
