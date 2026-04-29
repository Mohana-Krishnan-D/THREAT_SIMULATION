import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "./components/Card";
import { RiskGauge } from "./components/RiskGauge";
import { PasswordAnalyzer } from "./components/PasswordAnalyzer";
import { DdosPanel } from "./components/DdosPanel";
import { NetworkGraph } from "./components/NetworkGraph";
import { ActivityLog } from "./components/ActivityLog";
import { createRng } from "./utils/rng";
import { PasswordAnalysis } from "./utils/password";
import {
  DdosState,
  initialDdosState,
  nextDdosTick,
  ServerState,
} from "./utils/ddos";
import {
  buildNetwork,
  infectionPercent,
  NetworkState,
  spreadStep,
} from "./utils/network";
import { computeRisk } from "./utils/risk";
import { LogEntry, makeEntry, MAX_LOG, Severity } from "./utils/log";

const DDOS_SEED = 42;
const NETWORK_SEED = 7;

export default function App() {
  // ── Password ─────────────────────────────────────────
  const [pwAnalysis, setPwAnalysis] = useState<PasswordAnalysis | null>(null);

  // ── DDoS ─────────────────────────────────────────────
  const [ddos, setDdos] = useState<DdosState>(initialDdosState);
  const [ddosRunning, setDdosRunning] = useState(true);
  const ddosRngRef = useRef(createRng(DDOS_SEED));
  const lastDdosState = useRef<ServerState>("SAFE");

  // ── Network ──────────────────────────────────────────
  const [network, setNetwork] = useState<NetworkState>(() => buildNetwork(NETWORK_SEED));
  const [netRunning, setNetRunning] = useState(true);
  const netRngRef = useRef(createRng(NETWORK_SEED + 1000));

  // ── Log ──────────────────────────────────────────────
  const [log, setLog] = useState<LogEntry[]>([]);
  const pushLog = useCallback((severity: Severity, message: string) => {
    setLog(prev => [makeEntry(severity, message), ...prev].slice(0, MAX_LOG));
  }, []);

  // Initial log entry
  useEffect(() => {
    pushLog("INFO", "Cybersecurity simulation dashboard initialized.");
    pushLog("INFO", `Network seeded (${network.nodes.length} nodes, ${network.edges.length} edges).`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── DDoS tick loop (every 1s) ────────────────────────
  useEffect(() => {
    if (!ddosRunning) return;
    const id = setInterval(() => {
      setDdos(prev => {
        const next = nextDdosTick(prev, ddosRngRef.current);
        const last = next.history[next.history.length - 1];

        if (last?.isSpike) {
          pushLog("WARNING", `Traffic spike detected: ${last.traffic} req/s`);
        }
        if (next.state !== lastDdosState.current) {
          const sev: Severity =
            next.state === "DOWN" ? "CRITICAL"
            : next.state === "ATTACK" ? "CRITICAL"
            : next.state === "WARNING" ? "WARNING"
            : "INFO";
          pushLog(sev, `Server state → ${next.state} (load ${last?.load.toFixed(0)}%)`);
          lastDdosState.current = next.state;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ddosRunning, pushLog]);

  // ── Network spread loop (every 2s) ───────────────────
  useEffect(() => {
    if (!netRunning) return;
    const id = setInterval(() => {
      setNetwork(prev => {
        const result = spreadStep(prev, netRngRef.current);
        if (result.newlyInfected.length > 0) {
          const ids = result.newlyInfected.join(", ");
          const sev: Severity = result.newlyInfected.length > 2 ? "CRITICAL" : "WARNING";
          pushLog(sev, `Infection spread to node(s): ${ids}`);
        }
        return result.state;
      });
    }, 2000);
    return () => clearInterval(id);
  }, [netRunning, pushLog]);

  // ── Risk computation ─────────────────────────────────
  const lastDdos = ddos.history[ddos.history.length - 1];
  const infectionPct = useMemo(() => infectionPercent(network), [network]);
  const risk = useMemo(
    () =>
      computeRisk({
        passwordEntropy: pwAnalysis?.entropy ?? 0,
        serverLoad: lastDdos?.smoothedLoad ?? 0,
        infectionPercent: infectionPct,
      }),
    [pwAnalysis, lastDdos, infectionPct]
  );

  // ── Controls ─────────────────────────────────────────
  const resetNetwork = () => {
    netRngRef.current = createRng(NETWORK_SEED + 1000 + Date.now() % 1000);
    setNetwork(buildNetwork(NETWORK_SEED + (Math.floor(Date.now() / 1000) % 9)));
    pushLog("INFO", "Network reset. New patient zero infected.");
  };

  const resetDdos = () => {
    ddosRngRef.current = createRng(DDOS_SEED);
    setDdos(initialDdosState());
    lastDdosState.current = "SAFE";
    pushLog("INFO", "DDoS simulation reset.");
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100">
      {/* Background grid effect */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-emerald-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl">
              ⚡ Cyber Threat Simulation Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-400 md:text-sm">
              Educational, fully client-side. No real network activity is performed.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="font-mono">SIMULATION ACTIVE</span>
          </div>
        </header>

        {/* Top: Risk panel */}
        <Card
          title="Unified Risk Assessment"
          icon="🎯"
          className="mb-5"
          accent="shadow-cyan-500/10"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr]">
            <RiskGauge risk={risk} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <RiskBar
                label="Password Risk"
                weight="30%"
                value={risk.passwordRisk}
                hint={pwAnalysis?.strength ?? "No password"}
              />
              <RiskBar
                label="DDoS Risk"
                weight="40%"
                value={risk.ddosRisk}
                hint={ddos.state}
              />
              <RiskBar
                label="Infection Risk"
                weight="30%"
                value={risk.infectionRisk}
                hint={`${infectionPct.toFixed(0)}% infected`}
              />
              <div className="sm:col-span-3 rounded-lg border border-white/5 bg-[#0d1117] p-3 text-xs text-slate-400">
                <span className="font-mono">Risk = 0.3·PW + 0.4·DDoS + 0.3·Infection</span>
                <span className="float-right font-mono text-slate-200">
                  = {risk.score.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Middle: 3 modules */}
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card title="Password Analyzer" icon="🔐">
            <PasswordAnalyzer onChange={setPwAnalysis} />
          </Card>

          <Card
            title="DDoS Simulation"
            icon="🚨"
            right={
              <div className="flex gap-1">
                <ControlBtn onClick={() => setDdosRunning(r => !r)}>
                  {ddosRunning ? "Pause" : "Start"}
                </ControlBtn>
                <ControlBtn onClick={resetDdos}>Reset</ControlBtn>
              </div>
            }
          >
            <DdosPanel ddos={ddos} />
          </Card>

          <Card
            title="Network Infection"
            icon="🕸️"
            right={
              <div className="flex gap-1">
                <ControlBtn onClick={() => setNetRunning(r => !r)}>
                  {netRunning ? "Pause" : "Start"}
                </ControlBtn>
                <ControlBtn onClick={resetNetwork}>Reset</ControlBtn>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="h-64 overflow-hidden rounded-lg border border-white/5 bg-[#0d1117]">
                <NetworkGraph network={network} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Stat label="Infected" value={`${network.nodes.filter(n => n.infected).length}/${network.nodes.length}`} color="#ef4444" />
                <Stat label="Protected" value={`${network.nodes.filter(n => n.protected).length}`} color="#06b6d4" />
                <Stat label="Spread" value={`${infectionPct.toFixed(0)}%`} color="#f59e0b" />
              </div>
              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
                <Legend color="#22c55e" label="Healthy" />
                <Legend color="#ef4444" label="Infected" />
                <Legend color="#06b6d4" label="Firewall" />
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom: log */}
        <Card title="Activity Log" icon="📜" right={
          <button
            onClick={() => setLog([])}
            className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300"
          >
            Clear
          </button>
        }>
          <ActivityLog entries={log} />
        </Card>

        <footer className="mt-6 text-center text-xs text-slate-600">
          Built with React + TypeScript + Tailwind + Chart.js · Deterministic seeded simulation
        </footer>
      </div>
    </div>
  );
}

function ControlBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300"
    >
      {children}
    </button>
  );
}

function RiskBar({
  label,
  weight,
  value,
  hint,
}: {
  label: string;
  weight: string;
  value: number;
  hint: string;
}) {
  const color = value < 33 ? "#22c55e" : value < 66 ? "#f59e0b" : "#ef4444";
  return (
    <div className="rounded-lg border border-white/5 bg-[#0d1117] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <span className="text-[10px] font-mono text-slate-500">w={weight}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{hint}</span>
        <span className="font-mono font-semibold" style={{ color }}>
          {value.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-[#0d1117] p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-mono font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 4px ${color}` }}
      />
      {label}
    </span>
  );
}
