/** Every feel number in the game lives here. Nothing else invents one. */
export const TUNING = {
  /** Gap left between the buffers of two coupled vehicles, in metres. */
  couplingGap: 0.6,
  /** Close enough to grab. Buffer up slower than a walk and you are hooked on. */
  couplingReach: 1.4,
  /** Top speed of the shunter, m/s. */
  maxSpeed: 22,
  /** How hard the loco pulls, m/s^2. */
  acceleration: 9,
  /** How hard it stops when you brake. */
  braking: 16,
  /** Bleed-off when you let go of everything. */
  drag: 3,
  /** Buffer up faster than this and you get told off. */
  safeCouplingSpeed: 5,
} as const
