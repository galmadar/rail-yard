import type { Train } from '../../sim/train'
import type { Job } from '../../sim/World'
import { loco, wagon, type Vehicle } from '../../sim/vehicles'

const SHUNTER = loco('shunter', 'the shunter')
const VAN = wagon('van', 'the box van', '#a8443a', 'box-van')
const FLAT = wagon('flat', 'the flat wagon', '#8a8f96', 'flat')
const TANKER = wagon('tanker', 'the tanker', '#3f7fb8', 'tanker')
const STONE = wagon('stone', 'the stone hopper', '#4d7a44', 'ore-hopper')
const TIMBER = wagon('timber', 'the timber wagon', '#b8862f', 'timber')

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
 * Three days at Ridley Wharf. The one thing to learn is the trip up to the
 * crane road: two changes of direction, so whatever you take up there ends up
 * on the far side of the shunter and can be left behind. Every job leans on
 * that a little harder.
 */
export const RIDLEY_JOBS: JobSetup[] = [
  {
    job: {
      title: 'Three roads, three wagons',
      goals: [
        { vehicleId: 'timber', edgeId: 'timber-road', text: 'the timber wagon goes on the timber road' },
        { vehicleId: 'stone', edgeId: 'stone-road', text: 'the stone hopper goes on the stone road' },
        { vehicleId: 'van', edgeId: 'crane-road', text: 'the box van goes on the crane road' },
        {
          vehicleId: 'shunter',
          edgeId: 'headshunt',
          alone: true,
          finish: true,
          text: 'then bring the shunter home to the headshunt, on its own',
        },
      ],
    },
    // Standing in the order they have to be dealt out: the back road would
    // never hold all three of them anyway.
    layout: () => [
      standing('player', [SHUNTER], 'headshunt', 34),
      standing('cut-rake', [TIMBER, STONE, VAN], 'yard-road', 48),
    ],
  },
  {
    job: {
      title: 'The wrong way round',
      goals: [
        { vehicleId: 'stone', edgeId: 'stone-road', text: 'the stone hopper goes on the stone road' },
        {
          vehicleId: 'tanker',
          edgeId: 'crane-road',
          order: 1,
          text: 'the tanker goes right down the crane road, at the buffer stop end',
        },
        {
          vehicleId: 'van',
          edgeId: 'crane-road',
          order: 2,
          text: 'the box van stands next to it, on the points side',
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
    // The tanker has to go up first and the van is in the way, so the pair
    // cannot go up together - park one and make two trips.
    layout: () => [
      standing('player', [SHUNTER], 'headshunt', 34),
      standing('cut-quay', [STONE], 'quay', 44),
      standing('cut-rake', [VAN, TANKER], 'yard-road', 46),
    ],
  },
  {
    job: {
      title: 'Everything in the way',
      goals: [
        { vehicleId: 'tanker', edgeId: 'quay', text: 'the tanker goes on the quay road for the boat' },
        {
          vehicleId: 'van',
          edgeId: 'crane-road',
          order: 1,
          text: 'the box van goes right down the crane road, at the buffer stop end',
        },
        {
          vehicleId: 'flat',
          edgeId: 'crane-road',
          order: 2,
          text: 'the flat wagon stands next to it, on the points side',
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
    // Nothing can go up to the crane until the tanker is off it, and nothing
    // can go up at all while the quay is blocked - so the tanker cannot be put
    // on the quay until all the crane work is finished. Work that out first.
    layout: () => [
      standing('player', [SHUNTER], 'headshunt', 34),
      standing('cut-quay', [VAN], 'quay', 44),
      standing('cut-yard', [FLAT], 'yard-road', 30),
      standing('cut-crane', [TANKER], 'crane-road', 90),
    ],
  },
]
