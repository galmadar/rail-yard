import type { Polyline } from './geometry'
import { poseAt, type Pose } from './geometry'

export type NodeId = string
export type EdgeId = string

/** A dead end. Roll into it and you are stopped by the buffer stop. */
export interface BufferNode {
  kind: 'buffer'
  id: NodeId
  edge: EdgeId
}

/** Two pieces of track meeting end to end. */
export interface JointNode {
  kind: 'joint'
  id: NodeId
  a: EdgeId
  b: EdgeId
}

/**
 * A point. `toe` is the single end; `straight` and `diverge` are the two roads
 * it can send you down. Approaching from the leg that is not set is refused
 * rather than sprung - being stopped teaches the puzzle, derailing does not.
 */
export interface SwitchNode {
  kind: 'switch'
  id: NodeId
  label: string
  toe: EdgeId
  straight: EdgeId
  diverge: EdgeId
  state: 'straight' | 'diverge'
}

export type YardNode = BufferNode | JointNode | SwitchNode

export interface Edge {
  id: EdgeId
  name: string
  from: NodeId
  to: NodeId
  line: Polyline
}

/** A directed traversal of an edge: `forward` means from its `from` to its `to`. */
export interface Step {
  edge: EdgeId
  forward: boolean
}

/** A name board beside a road, `at` being the fraction along it where it stands. */
export interface SignPost {
  edge: EdgeId
  at: number
}

export interface Yard {
  nodes: Map<NodeId, YardNode>
  edges: Map<EdgeId, Edge>
  switchOrder: NodeId[]
  signs: SignPost[]
}

export function edge(y: Yard, id: EdgeId): Edge {
  const e = y.edges.get(id)
  if (!e) throw new Error(`no such edge: ${id}`)
  return e
}

export function stepLength(y: Yard, step: Step): number {
  return edge(y, step.edge).line.length
}

/** The node a directed traversal runs out at. */
export function exitNode(y: Yard, step: Step): NodeId {
  const e = edge(y, step.edge)
  return step.forward ? e.to : e.from
}

/** The node a directed traversal starts from. */
export function entryNode(y: Yard, step: Step): NodeId {
  const e = edge(y, step.edge)
  return step.forward ? e.from : e.to
}

export type Continuation =
  | { ok: true; step: Step }
  | { ok: false; reason: 'buffer' | 'switch-against' }

/** Which way the track carries on past `node`, having arrived along `from`. */
export function continueThrough(y: Yard, node: NodeId, from: EdgeId): Continuation {
  const n = y.nodes.get(node)
  if (!n) throw new Error(`no such node: ${node}`)

  let next: EdgeId | null = null
  if (n.kind === 'buffer') {
    next = null
  } else if (n.kind === 'joint') {
    next = from === n.a ? n.b : n.a
  } else {
    const selected = n.state === 'straight' ? n.straight : n.diverge
    if (from === n.toe) next = selected
    else if (from === selected) next = n.toe
    else return { ok: false, reason: 'switch-against' }
  }

  if (next === null) return { ok: false, reason: 'buffer' }
  const e = edge(y, next)
  return { ok: true, step: { edge: next, forward: e.from === node } }
}

/** Pose `s` metres into a directed traversal. */
export function poseAlong(y: Yard, step: Step, s: number): Pose {
  const e = edge(y, step.edge)
  if (step.forward) return poseAt(e.line, s)
  const p = poseAt(e.line, e.line.length - s)
  return { x: p.x, z: p.z, heading: p.heading + Math.PI }
}

export function throwSwitch(y: Yard, id: NodeId): boolean {
  const n = y.nodes.get(id)
  if (!n || n.kind !== 'switch') return false
  n.state = n.state === 'straight' ? 'diverge' : 'straight'
  return true
}
