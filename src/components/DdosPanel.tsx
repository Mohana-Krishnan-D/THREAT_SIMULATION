import { useEffect, useMemo, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { DdosState, SERVER_CAPACITY, ServerState } from "../utils/ddos";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

const STATE_COLORS: Record<ServerState, string> = {
  SAFE: "#22c55e",
  WARNING: "#f59e0b",
  ATTACK: "#ef4444",
  DOWN: "#7f1d1d",
  RECOVERING: "#06b6d4",
};

interface Props {
  ddos: DdosState;
}

export function DdosPanel({ ddos }: Props) {
  const last = ddos.history[ddos.history.length - 1];
  const color = STATE_COLORS[ddos.state];
  const load = last?.load ?? 0;
  const traffic = last?.traffic ?? 0;

  const data = useMemo(() => {
    const labels = ddos.history.map(h => `t${h.t}`);
    return {
      labels,
      datasets: [
        {
          label: "Traffic (req/s)",
          data: ddos.history.map(h => h.traffic),
          borderColor: color,
          backgroundColor: `${color}33`,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: "Capacity",
          data: ddos.history.map(() => SERVER_CAPACITY),
          borderColor: "#ef4444",
          borderDash: [4, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [ddos.history, color]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      scales: {
        x: { display: false },
        y: {
          beginAtZero: true,
          suggestedMax: 2000,
          ticks: { color: "#64748b", font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom" as const,
          labels: { color: "#94a3b8", font: { size: 10 }, boxWidth: 10 },
        },
        tooltip: { enabled: true },
      },
    }),
    []
  );

  // Pulse effect on attack
  const pulseRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (last?.isSpike && pulseRef.current) {
      pulseRef.current.classList.remove("animate-pulse-fast");
      // restart animation
      void pulseRef.current.offsetWidth;
      pulseRef.current.classList.add("animate-pulse-fast");
    }
  }, [last?.t, last?.isSpike]);

  const gaugePct = Math.min(100, load);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div
          ref={pulseRef}
          className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ background: `${color}22`, color, boxShadow: `0 0 12px ${color}55` }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {ddos.state}
        </div>
        <div className="font-mono text-xs text-slate-400">
          tick #{ddos.tickCount}
        </div>
      </div>

      <div className="h-40 rounded-lg border border-white/5 bg-[#0d1117] p-2">
        {ddos.history.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Awaiting traffic data…
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/5 bg-[#0d1117] p-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span>Server Load</span>
            <span className="font-mono text-slate-200">{load.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${gaugePct}%`,
                background: color,
                boxShadow: `0 0 8px ${color}`,
              }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-[#0d1117] p-3">
          <div className="text-xs text-slate-400">Current Traffic</div>
          <div className="font-mono text-lg font-bold" style={{ color }}>
            {traffic.toLocaleString()}
            <span className="ml-1 text-xs font-normal text-slate-500">req/s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
