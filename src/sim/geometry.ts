export interface Vec2 {
  x: number
  z: number
}

/** A track's shape: a polyline plus the cumulative arc length at each point. */
export interface Polyline {
  points: Vec2[]
  cumulative: number[]
  length: number
}

export function polyline(points: Vec2[]): Polyline {
  if (points.length < 2) throw new Error('a polyline needs at least two points')
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dz = points[i].z - points[i - 1].z
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dz))
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1] }
}

export function straight(from: Vec2, to: Vec2): Polyline {
  return polyline([from, to])
}

/**
 * An S-curve that leaves `from` and arrives at `to` running dead straight in x
 * at both ends, so it joins horizontal track without a kink.
 */
export function sCurve(from: Vec2, to: Vec2, samples = 40): Polyline {
  const points: Vec2[] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    // Quintic ease: flat entry and exit, so the join to straight track is smooth.
    const ease = t * t * t * (t * (t * 6 - 15) + 10)
    points.push({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * ease })
  }
  return polyline(points)
}

/** Join polylines head to tail, dropping the duplicated seam point. */
export function join(...parts: Polyline[]): Polyline {
  const points = [...parts[0].points]
  for (let i = 1; i < parts.length; i++) points.push(...parts[i].points.slice(1))
  return polyline(points)
}

export interface Pose {
  x: number
  z: number
  /** Heading in radians, measured the same way as atan2(dz, dx). */
  heading: number
}

/** Where you are, and which way you are pointing, `s` metres along the line. */
export function poseAt(line: Polyline, s: number): Pose {
  const clamped = Math.max(0, Math.min(line.length, s))
  let i = 1
  while (i < line.cumulative.length - 1 && line.cumulative[i] < clamped) i++
  const segStart = line.cumulative[i - 1]
  const segLen = line.cumulative[i] - segStart
  const t = segLen > 0 ? (clamped - segStart) / segLen : 0
  const a = line.points[i - 1]
  const b = line.points[i]
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    heading: Math.atan2(b.z - a.z, b.x - a.x),
  }
}
