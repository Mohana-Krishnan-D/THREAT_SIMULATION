import { createRng } from "./rng";

export interface NetNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  infected: boolean;
  protected: boolean;
  resistance: number; // 0-0.3
}

export interface NetEdge {
  a: number;
  b: number;
}

export interface NetworkState {
  nodes: NetNode[];
  edges: NetEdge[];
}

export const NODE_COUNT = 15;
export const INFECTION_PROB = 0.4;

export function buildNetwork(seed: number, width = 600, height = 400): NetworkState {
  const rand = createRng(seed);
  const nodes: NetNode[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      id: i,
      x: 60 + rand() * (width - 120),
      y: 60 + rand() * (height - 120),
      vx: 0,
      vy: 0,
      infected: false,
      protected: rand() < 0.15, // ~15% firewall nodes
      resistance: rand() * 0.3,
    });
  }

  const edges: NetEdge[] = [];
  const edgeSet = new Set<string>();
  // Ensure connectivity: each node links to at least one earlier node
  for (let i = 1; i < NODE_COUNT; i++) {
    const j = Math.floor(rand() * i);
    const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ a: j, b: i });
    }
  }
  // Add extra random edges for richer topology
  const extras = NODE_COUNT; // ~15 extra
  for (let k = 0; k < extras; k++) {
    const a = Math.floor(rand() * NODE_COUNT);
    let b = Math.floor(rand() * NODE_COUNT);
    if (a === b) b = (b + 1) % NODE_COUNT;
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ a, b });
    }
  }

  // Pick a random non-protected node as patient zero
  const candidates = nodes.filter(n => !n.protected);
  const patientZero = candidates[Math.floor(rand() * candidates.length)] ?? nodes[0];
  patientZero.infected = true;

  return { nodes, edges };
}

export function adjacency(state: NetworkState): Map<number, number[]> {
  const map = new Map<number, number[]>();
  state.nodes.forEach(n => map.set(n.id, []));
  state.edges.forEach(e => {
    map.get(e.a)!.push(e.b);
    map.get(e.b)!.push(e.a);
  });
  return map;
}

export interface SpreadResult {
  state: NetworkState;
  newlyInfected: number[];
}

export function spreadStep(
  state: NetworkState,
  rand: () => number,
  baseProb = INFECTION_PROB
): SpreadResult {
  const adj = adjacency(state);
  const infectedIds = new Set(state.nodes.filter(n => n.infected).map(n => n.id));
  const newly: number[] = [];

  state.nodes.forEach(n => {
    if (n.infected || n.protected) return;
    const neighbors = adj.get(n.id) ?? [];
    const infectedNeighbors = neighbors.filter(nid => infectedIds.has(nid)).length;
    if (infectedNeighbors === 0) return;
    // Combine multiple exposure attempts
    for (let k = 0; k < infectedNeighbors; k++) {
      const effective = baseProb * (1 - n.resistance);
      if (rand() < effective) {
        newly.push(n.id);
        break;
      }
    }
  });

  if (newly.length === 0) return { state, newlyInfected: [] };

  const newNodes = state.nodes.map(n =>
    newly.includes(n.id) ? { ...n, infected: true } : n
  );
  return { state: { ...state, nodes: newNodes }, newlyInfected: newly };
}

export function infectionPercent(state: NetworkState): number {
  const infected = state.nodes.filter(n => n.infected).length;
  return (infected / state.nodes.length) * 100;
}
