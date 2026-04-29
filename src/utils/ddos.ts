export type ServerState = "SAFE" | "WARNING" | "ATTACK" | "DOWN" | "RECOVERING";

export const SERVER_CAPACITY = 1000;
export const MAX_HISTORY = 20;

export interface DdosTick {
  traffic: number;
  load: number;
  smoothedLoad: number;
  state: ServerState;
  isSpike: boolean;
  t: number; // tick index
}

export interface DdosState {
  history: DdosTick[];
  state: ServerState;
  overloadStreak: number;
  recoveryRemaining: number;
  tickCount: number;
}

export function initialDdosState(): DdosState {
  return {
    history: [],
    state: "SAFE",
    overloadStreak: 0,
    recoveryRemaining: 0,
    tickCount: 0,
  };
}

export function nextDdosTick(prev: DdosState, rand: () => number): DdosState {
  const isSpike = rand() < 0.1;
  const traffic = isSpike
    ? Math.floor(500 + rand() * 1500) // 500–2000
    : Math.floor(50 + rand() * 50); // 50–100

  const load = (traffic / SERVER_CAPACITY) * 100;

  // Moving average smoothing over last few points
  const tail = prev.history.slice(-4).map(h => h.load);
  const smoothedLoad =
    [...tail, load].reduce((a, b) => a + b, 0) / (tail.length + 1);

  let overloadStreak = load > 100 ? prev.overloadStreak + 1 : 0;
  let recoveryRemaining = prev.recoveryRemaining;
  let state: ServerState = prev.state;

  // State transitions with anti-flicker (recovering cooldown)
  if (state === "DOWN") {
    // Begin recovery once load returns under capacity
    if (load <= 100) {
      state = "RECOVERING";
      recoveryRemaining = 10;
    }
  } else if (state === "RECOVERING") {
    recoveryRemaining = Math.max(0, recoveryRemaining - 1);
    if (overloadStreak >= 5) {
      state = "DOWN";
      recoveryRemaining = 0;
    } else if (recoveryRemaining === 0) {
      // After cooldown, settle into safe/warning based on smoothed load
      state = smoothedLoad >= 70 ? "WARNING" : "SAFE";
    }
  } else {
    // SAFE / WARNING / ATTACK
    if (overloadStreak >= 5) {
      state = "DOWN";
    } else if (isSpike || load > 100) {
      state = "ATTACK";
    } else if (smoothedLoad >= 70) {
      state = "WARNING";
    } else {
      state = "SAFE";
    }
  }

  const tickCount = prev.tickCount + 1;
  const tick: DdosTick = {
    traffic,
    load,
    smoothedLoad,
    state,
    isSpike,
    t: tickCount,
  };

  const history = [...prev.history, tick].slice(-MAX_HISTORY);

  return {
    history,
    state,
    overloadStreak,
    recoveryRemaining,
    tickCount,
  };
}
