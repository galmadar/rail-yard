import type { Train } from '../../sim/train'
import type { Job } from '../../sim/World'
import { loco, wagon, type Vehicle } from '../../sim/vehicles'

const SHUNTER = loco('shunter', 'the shunter')
const TANKER = wagon('tanker', 'the tanker', '#3f7fb8')
const HOPPER = wagon('hopper', 'the coal hopper', '#4d7a44')
const VAN = wagon('van', 'the box van', '#a8443a')
const FLAT = wagon('flat', 'the flat wagon', '#8a8f96')
const BRAKE = wagon('brake', 'the brake van', '#6b4a2f')

/** A cut standing still. `cars` runs from the far end of the road back towards the points. */
function standing(id: string, cars: Vehicle[], edge: string, head: number): Train {
  return {
    id,
    cars: cars.map((vehicle) => ({ vehicle, reversed: false })),
    path: [{ edge, forward: true }],
    head,
    speed: 0,
  }
}

export interface JobSetup {
  job: Job
  /** Built fresh each time, so starting a job over really starts it over. */
  layout: () => Train[]
}

/**
 * Three days' work at Marsden, each one leaning harder on the same yard.
 *
 * Every road is shoved into from the west, so whatever goes in first ends up
 * deepest - that one fact is the whole of jobs two and three.
 */
export const MARSDEN_JOBS: JobSetup[] = [
  {
    job: {
      title: 'Sort the yard',
      goals: [
        { vehicleId: 'van', edgeId: 'goods-road', text: 'the box van goes on the goods road' },
        { vehicleId: 'tanker', edgeId: 'oil-road', text: 'the tanker goes on the oil road' },
        { vehicleId: 'hopper', edgeId: 'coal-road', text: 'the coal hopper goes on the coal road' },
      ],
    },
    layout: () => [
      standing('player', [SHUNTER], 'headshunt', 55),
      standing('cut-tanker', [TANKER], 'goods-road', 95),
      standing('cut-hopper', [HOPPER], 'oil-road', 85),
      standing('cut-van', [VAN], 'spare', 34),
    ],
  },
  {
    job: {
      title: 'Make up the goods train',
      goals: [
        {
          vehicleId: 'van',
          edgeId: 'goods-road',
          order: 1,
          text: 'the box van goes right down the far end of the goods road',
        },
        {
          vehicleId: 'tanker',
          edgeId: 'goods-road',
          order: 2,
          text: 'the tanker stands behind the box van',
        },
        {
          vehicleId: 'hopper',
          edgeId: 'goods-road',
          order: 3,
          text: 'the coal hopper stands behind the tanker',
        },
      ],
    },
    // Spread over three roads so the order you fetch them in is the whole puzzle.
    layout: () => [
      standing('player', [SHUNTER], 'headshunt', 55),
      standing('cut-van', [VAN], 'coal-road', 70),
      standing('cut-tanker', [TANKER], 'oil-road', 90),
      standing('cut-hopper', [HOPPER], 'spare', 70),
    ],
  },
  {
    job: {
      title: 'Break up the long train',
      goals: [
        {
          vehicleId: 'van',
          edgeId: 'goods-road',
          order: 1,
          text: 'the box van goes right down the far end of the goods road',
        },
        {
          vehicleId: 'brake',
          edgeId: 'goods-road',
          order: 2,
          text: 'the brake van stands behind the box van',
        },
        { vehicleId: 'tanker', edgeId: 'oil-road', text: 'the tanker goes on the oil road' },
        {
          vehicleId: 'hopper',
          edgeId: 'coal-road',
          order: 1,
          text: 'the coal hopper goes right down the far end of the coal road',
        },
        {
          vehicleId: 'flat',
          edgeId: 'coal-road',
          order: 2,
          text: 'the flat wagon stands behind the coal hopper',
        },
        {
          vehicleId: 'shunter',
          edgeId: 'headshunt',
          alone: true,
          finish: true,
          text: 'then park the shunter back on the headshunt, on its own',
        },
      ],
    },
    // Standing the wrong way round on purpose: the van and the hopper have to go
    // in first, so the two wagons in front of them need somewhere to wait.
    layout: () => [
      standing('player', [SHUNTER], 'headshunt', 55),
      standing('cut-rake', [BRAKE, FLAT, TANKER, HOPPER, VAN], 'goods-road', 115),
    ],
  },
]
