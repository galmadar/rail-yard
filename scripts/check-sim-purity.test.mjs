import { describe, expect, it } from 'vitest'
import { findViolations } from './check-sim-purity.mjs'

describe('sim purity check', () => {
  it.each([
    `import * as THREE from 'three'`,
    `import { Vector3 } from "three"`,
    `import {Vector3}from'three'`,
    `import type { Mesh } from 'three'`,
    `import 'three'`,
    `import'three'`,
    `const T = await import('three')`,
    `const T = import ( "three" )`,
    `const T = require('three')`,
    `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'`,
    `import 'three/addons/foo.js'`,
    `export * from 'three'`,
  ])('catches three in: %s', (src) => {
    expect(findViolations(src)).toContain('imports three')
  })

  it.each([
    `document.body.appendChild(x)`,
    `const w = window.innerWidth`,
    `navigator.vibrate(10)`,
    `window?.addEventListener('x', f)`,
  ])('catches DOM globals in: %s', (src) => {
    expect(findViolations(src)).toContain('uses a DOM global')
  })

  it.each([
    `// shove all three down the goods road`,
    `/* import 'three' used to live here */`,
    `const title = 'Three roads, three wagons'`,
    `import { stuff } from './threeish'`,
    `import { x } from 'three-mesh-bvh'`,
    `yard.window.open = true`,
    `const s = 'see document.title'`,
  ])('lets clean code through: %s', (src) => {
    expect(findViolations(src)).toEqual([])
  })
})
