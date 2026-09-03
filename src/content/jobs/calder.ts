import type { Train } from '../../sim/train'
import type { Job } from '../../sim/World'
import { loco, wagon, type Vehicle } from '../../sim/vehicles'

const SHUNTER = loco('shunter', 'the shunter')
const SAND = wagon('sand', 'the sand hopper', '#c9a227', 'ore-hopper')
const ACID = wagon('acid', 'the tanker', '#3f7fb8', 'tanker')
const CRATE = wagon('crate', 'the crate van', '#a8443a', 'box-van')
const LOG = wagon('log', 'the timber wagon', '#8a5a2b', 'timber')

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
 * Three days at Calder Triangle. The sand road trails back west, so nothing can
 * be left down it until the train has been turned on the triangle; the mill road
 * faces the other way and wants a train that has not been turned. Each job asks
 * for the turn a little harder, and the last one asks for it twice.
 */
export const CALDER_JOBS: JobSetup[] = [
  {
    job: {
      title: 'Turn it round',
      goals: [
        { vehicleId: 'sand', edgeId: 'sand-road', text: 'the sand hopper goes on the sand road' },
        {
          vehicleId: 'shunter',
          edgeId: 'headshunt',
          alone: true,
          finish: true,
          text: 'then bring the shunter home to the headshunt, on its own',
        },
      ],
    },
    // One wagon, one siding, and the siding faces the wrong way. Nothing else
    // to think about while you learn the way round the triangle.
    layout: () => [
      standing('player', [SHUNTER], 'west-road', 30),
      standing('cut-sand', [SAND], 'base-west', 20),
    ],
  },
  {
    job: {
      title: 'The whole train the other way up',
      goals: [
        {
          vehicleId: 'crate',
          edgeId: 'sand-road',
          order: 1,
          text: 'the crate van goes right down the sand road, at the buffer stop end',
        },
        {
          vehicleId: 'acid',
          edgeId: 'sand-road',
          order: 2,
          text: 'the tanker stands next to it, on the side nearer the points',
        },
        {
          vehicleId: 'sand',
          edgeId: 'sand-road',
          order: 3,
          text: 'the sand hopper stands next to the tanker, nearest the points',
        },
        {
          vehicleId: 'shunter',
          edgeId: 'headshunt',
          alone: true,
          finish: true,
          text: 'then bring the shunter home to the headshunt, on its own',
        },
      ],
    },
    // They stand in the order they are wanted, so pick them all up and take the
    // lot round in one go - the triangle keeps them in step.
    layout: () => [
      standing('player', [SHUNTER], 'headshunt', 25),
      standing('cut-rake', [CRATE, ACID, SAND], 'west-road', 52),
    ],
  },
  {
    job: {
      title: 'Round twice',
      goals: [
        { vehicleId: 'log', edgeId: 'sand-road', text: 'the timber wagon goes on the sand road' },
        {
          vehicleId: 'crate',
          edgeId: 'mill-road',
          order: 1,
          text: 'the crate van goes right down the mill road, at the buffer stop end',
        },
        {
          vehicleId: 'acid',
          edgeId: 'mill-road',
          order: 2,
          text: 'the tanker stands next to it, on the side nearer the points',
        },
        {
          vehicleId: 'shunter',
          edgeId: 'headshunt',
          alone: true,
          finish: true,
          text: 'then bring the shunter home to the headshunt, on its own',
        },
      ],
    },
    // The timber wagon is parked on the turning road and has to come out before
    // anything can be turned at all. Then one lot wants turning and the other
    // lot wants turning back.
    layout: () => [
      standing('player', [SHUNTER], 'west-road', 52),
      standing('cut-top', [LOG], 'turning-road', 30),
      standing('cut-rake', [ACID, CRATE], 'west-road', 34),
    ],
  },
]
