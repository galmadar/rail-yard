/** Every feel number in the game lives here. Nothing else invents one. */
export const TUNING = {
  /** Gap left between the buffers of two coupled vehicles, in metres. */
  couplingGap: 0.6,
  /** Close enough to grab. Buffer up slower than a walk and you are hooked on. */
  couplingReach: 1.4,
  /**
   * How far a train may move between two coupling checks, in metres. Well under
   * `couplingReach`, so however fast it is going it can never step clean over a
   * standing cut instead of hooking on to it.
   */
  couplingStep: 0.3,
  /** Top speed of the shunter, m/s. 100 km/h - a real train. */
  maxSpeed: 27.8,
  /** How hard the loco pulls, m/s^2. Flat out in a second and a half. */
  acceleration: 19,
  /** How hard it stops when you brake. Twelve metres from full speed: aim it. */
  braking: 32,
  /** Bleed-off when you let go of everything. */
  drag: 5,
  /**
   * How quickly a cut with nobody driving it runs down, m/s^2. Low enough that
   * a kicked wagon really runs, high enough that a runaway on Halton's closed
   * loop still stands inside two minutes instead of circling for ever.
   */
  rollingResistance: 0.36,
  /** Buffer up faster than this and you get told off. */
  safeCouplingSpeed: 5,
} as const
