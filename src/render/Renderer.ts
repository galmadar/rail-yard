import * as THREE from 'three'
import { carPose, carSpan, poseOnPath } from '../sim/train'
import { playerTrain, type World } from '../sim/World'
import { TUNING } from '../sim/tuning'
import { buildSwitchMarkers, buildTrack, type SwitchMarker } from './TrackView'
import { buildHighlight, buildPin, buildVehicle } from './VehicleView'
import { buildRoadSigns } from './RoadSigns'
import { DEFAULT_VIEW, YardCamera } from './YardCamera'

const LAMP_STRAIGHT = 0x2f6ad0
const LAMP_DIVERGE = 0xd8a417

export class Renderer {
  readonly view: YardCamera
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private vehicles = new Map<string, THREE.Group>()
  private markers: SwitchMarker[] = []
  private rings: THREE.Mesh[] = []
  private pin: THREE.Group

  constructor(canvas: HTMLCanvasElement, world: World) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const view = world.yard.view ?? DEFAULT_VIEW
    this.view = new YardCamera(canvas, view)

    // Haze and shadows are pegged to how far back the yard wants to be seen,
    // so a big yard does not vanish into the murk.
    this.scene.background = new THREE.Color(0x9fb4c4)
    this.scene.fog = new THREE.Fog(0x9fb4c4, view.distance * 1.2, view.distance * 4.13)

    const sun = new THREE.DirectionalLight(0xfff2dd, 2.1)
    sun.position.set(-60, 90, 40)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const span = Math.max(140, view.distance * 0.95)
    const s = sun.shadow.camera
    s.left = -span
    s.right = span
    s.top = span
    s.bottom = -span
    s.near = 1
    s.far = Math.max(320, view.distance * 2.2)
    this.scene.add(sun)
    this.scene.add(new THREE.HemisphereLight(0xbfd6e8, 0x54603f, 1.0))

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200),
      new THREE.MeshStandardMaterial({ color: 0x6f7a4e, roughness: 1 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    this.scene.add(buildTrack(world.yard))

    const wanted = new Map<string, string>()
    for (const goal of world.job.goals) {
      for (const t of world.trains) {
        const car = t.cars.find((c) => c.vehicle.id === goal.vehicleId)
        if (car) wanted.set(goal.edgeId, car.vehicle.colour)
      }
    }
    this.scene.add(buildRoadSigns(world.yard, wanted))
    const marks = buildSwitchMarkers(world.yard)
    this.markers = marks.markers
    this.scene.add(marks.group)

    for (const train of world.trains) {
      for (const car of train.cars) {
        const mesh = buildVehicle(car.vehicle)
        this.vehicles.set(car.vehicle.id, mesh)
        this.scene.add(mesh)
      }
    }
    for (const goal of world.job.goals) {
      const ring = buildHighlight()
      ring.visible = false
      this.rings.push(ring)
      this.scene.add(ring)
      ring.userData.vehicleId = goal.vehicleId
    }

    this.pin = buildPin()
    this.pin.visible = false
    this.scene.add(this.pin)

    addEventListener('resize', () => this.resize())
    this.resize()
  }

  private resize(): void {
    const w = innerWidth
    const h = innerHeight
    this.renderer.setSize(w, h, false)
    this.view.resize(w, h)
  }

  locoPosition(world: World): { x: number; z: number } | null {
    for (const t of world.trains) {
      const i = t.cars.findIndex((c) => c.vehicle.kind === 'loco')
      if (i >= 0) return carPose(world.yard, t, i)
    }
    return null
  }

  sync(world: World, dt: number): void {
    for (const t of world.trains) {
      for (let i = 0; i < t.cars.length; i++) {
        const car = t.cars[i]
        const mesh = this.vehicles.get(car.vehicle.id)
        if (!mesh) continue
        const p = carPose(world.yard, t, i)
        mesh.position.set(p.x, 0, p.z)
        mesh.rotation.y = -p.heading + (car.reversed ? Math.PI : 0)
      }
    }

    for (const marker of this.markers) {
      const node = world.yard.nodes.get(marker.id)
      if (!node || node.kind !== 'switch') continue
      const diverge = node.state === 'diverge'
      const mat = marker.lamp.material as THREE.MeshStandardMaterial
      const colour = diverge ? LAMP_DIVERGE : LAMP_STRAIGHT
      mat.color.setHex(colour)
      mat.emissive.setHex(colour)
      mat.emissiveIntensity = 0.9
      marker.lever.rotation.z = diverge ? 0.6 : -0.6
    }

    const pulse = 0.55 + 0.25 * Math.sin(world.time * 3)
    for (const ring of this.rings) {
      const mesh = this.vehicles.get(ring.userData.vehicleId as string)
      if (!mesh) continue
      ring.visible = !world.done
      ring.position.set(mesh.position.x, 0.08, mesh.position.z)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = pulse
    }

    const player = playerTrain(world)
    if (player && player.cars.length > 1) {
      const at = Math.max(1, Math.min(player.cars.length - 1, world.cutAt))
      const p = poseOnPath(world.yard, player, carSpan(player, at).front + TUNING.couplingGap / 2)
      this.pin.visible = true
      this.pin.position.set(p.x, 0.35 * Math.sin(world.time * 4), p.z)
      this.pin.rotation.y = -p.heading
    } else {
      this.pin.visible = false
    }

    this.view.update(this.locoPosition(world), dt)
    this.renderer.render(this.scene, this.view.camera)
  }
}
