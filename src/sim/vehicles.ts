export type VehicleKind = 'loco' | 'wagon'

/**
 * What the vehicle actually is. The yard is read by shape first, so this is the
 * one fact the renderer needs that colour and name cannot give it.
 */
export type VehicleBody =
  | 'loco'
  | 'box-van'
  | 'flat'
  | 'tanker'
  | 'coal-hopper'
  | 'ore-hopper'
  | 'brake-van'
  | 'timber'

export interface Vehicle {
  id: string
  kind: VehicleKind
  body: VehicleBody
  /** What the player calls it out loud: "RED", "the tanker". */
  name: string
  colour: string
  length: number
  width: number
  height: number
}

export function loco(id: string, name = 'shunter'): Vehicle {
  return { id, kind: 'loco', body: 'loco', name, colour: '#2f3a45', length: 9, width: 3, height: 3.6 }
}

export function wagon(id: string, name: string, colour: string, body: VehicleBody = 'box-van'): Vehicle {
  return { id, kind: 'wagon', body, name, colour, length: 7, width: 3, height: 3.2 }
}
