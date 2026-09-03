/** Below this the train is running too near the camera's line of sight to tell. */
const CLEAR_ENOUGH = 0.35

/**
 * How strongly the loco's nose points right across the screen: +1 dead right,
 * -1 dead left, 0 when it is running straight at or away from the camera.
 */
export function noseTowardsScreenRight(
  cameraRightX: number,
  cameraRightZ: number,
  heading: number,
  nose: number,
): number {
  return (cameraRightX * Math.cos(heading) + cameraRightZ * Math.sin(heading)) * nose
}

/**
 * Turns the Right arrow into a regulator setting. It remembers which way right
 * was, because a train running straight at the camera flips the reading on the
 * smallest nudge of the mouse, and a control that reverses mid-shove is worse
 * than one that points the wrong way.
 */
export class Steering {
  private noseIsRight = 1

  throttle(way: number, steer: number, speed: number): number {
    const settled = steer === 0 && Math.abs(speed) < 0.05
    if (Math.abs(way) >= CLEAR_ENOUGH || (settled && way !== 0)) {
      this.noseIsRight = way > 0 ? 1 : -1
    }
    return steer * this.noseIsRight
  }
}
