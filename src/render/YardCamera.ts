import * as THREE from 'three'

/**
 * Looks down on the yard from behind and above. It rides with the shunter by
 * default; press F and it stays put so you can look over the whole job.
 */
export class YardCamera {
  readonly camera: THREE.PerspectiveCamera
  private target = new THREE.Vector3(-20, 0, -14)
  private azimuth = Math.PI / 2
  private elevation = 0.78
  private distance = 150
  private dragging: 'orbit' | 'pan' | null = null
  private last = { x: 0, y: 0 }
  follow = true

  constructor(canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 900)

    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = e.button === 2 || e.shiftKey ? 'pan' : 'orbit'
      this.last = { x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
    })
    canvas.addEventListener('pointerup', (e) => {
      this.dragging = null
      canvas.releasePointerCapture(e.pointerId)
    })
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return
      const dx = e.clientX - this.last.x
      const dy = e.clientY - this.last.y
      this.last = { x: e.clientX, y: e.clientY }
      if (this.dragging === 'orbit') {
        this.azimuth -= dx * 0.005
        this.elevation = Math.max(0.18, Math.min(1.45, this.elevation + dy * 0.004))
      } else {
        this.follow = false
        const scale = this.distance * 0.0016
        const sin = Math.sin(this.azimuth)
        const cos = Math.cos(this.azimuth)
        this.target.x += (-dx * cos - dy * sin) * scale
        this.target.z += (-dx * sin + dy * cos) * scale
      }
    })
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        this.distance = Math.max(18, Math.min(260, this.distance * (1 + Math.sign(e.deltaY) * 0.12)))
      },
      { passive: false },
    )
  }

  toggleFollow(): boolean {
    this.follow = !this.follow
    return this.follow
  }

  update(locoAt: { x: number; z: number } | null, dt: number): void {
    if (this.follow && locoAt) {
      const ease = 1 - Math.pow(0.001, dt)
      this.target.x += (locoAt.x - this.target.x) * ease
      this.target.z += (locoAt.z - this.target.z) * ease
    }
    const horizontal = Math.cos(this.elevation) * this.distance
    this.camera.position.set(
      this.target.x + Math.cos(this.azimuth) * horizontal,
      this.target.y + Math.sin(this.elevation) * this.distance,
      this.target.z + Math.sin(this.azimuth) * horizontal,
    )
    this.camera.lookAt(this.target)
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
}
