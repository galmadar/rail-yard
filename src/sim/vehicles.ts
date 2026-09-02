export type VehicleKind = 'loco' | 'wagon'

export interface Vehicle {
  id: string
  kind: VehicleKind
  /** What the player calls it out loud: "RED", "the tanker". */
  name: string
  colour: string
  length: number
  width: number
  height: number
}

export function loco(id: string, name = 'shunter'): Vehicle {
  return { id, kind: 'loco', name, colour: '#2f3a45', length: 9, width: 3, height: 3.6 }
}

export function wagon(id: string, name: string, colour: string): Vehicle {
  return { id, kind: 'wagon', name, colour, length: 7, width: 3, height: 3.2 }
}
