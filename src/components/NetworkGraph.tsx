import { useEffect, useRef, useState } from "react";
import { NetworkState } from "../utils/network";

interface Props {
  network: NetworkState;
  width?: number;
  height?: number;
}

interface Pos {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// Lightweight force-directed layout (runs once on network change, then idles)
export function NetworkGraph({ network, width = 560, height = 360 }: Props) {
  const [positions, setPositions] = useState<Pos[]>(() =>
    network.nodes.map(n => ({ x: n.x, y: n.y, vx: 0, vy: 0 }))
  );
  const rafRef = useRef<number | null>(null);
  const stopAtRef = useRef<number>(0);
  const networkRef = useRef(network);
  networkRef.current = network;

  // Reset positions when topology changes (different node count or seed)
  useEffect(() => {
    setPositions(network.nodes.map(n => ({ x: n.x, y: n.y, vx: 0, vy: 0 })));
    stopAtRef.current = performance.now() + 4000; // simulate 4s
  }, [network.nodes.length, network]);

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      if (now > stopAtRef.current) {
        rafRef.current = null;
        return;
      }
      setPositions(prev => {
        const net = networkRef.current;
        const next = prev.map(p => ({ ...p }));
        const k = 80; // ideal edge length
        const repulse = 1400;

        // Repulsion
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x;
            const dy = next[j].y - next[i].y;
            const d2 = dx * dx + dy * dy + 0.01;
            const f = repulse / d2;
            const d = Math.sqrt(d2);
            const fx = (dx / d) * f;
            const fy = (dy / d) * f;
            next[i].vx -= fx;
            next[i].vy -= fy;
            next[j].vx += fx;
            next[j].vy += fy;
          }
        }

        // Spring on edges
        net.edges.forEach(e => {
          const a = next[e.a];
          const b = next[e.b];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
          const f = (d - k) * 0.05;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        });

        // Center pull + integration
        const cx = width / 2;
        const cy = height / 2;
        for (let i = 0; i < next.length; i++) {
          next[i].vx += (cx - next[i].x) * 0.005;
          next[i].vy += (cy - next[i].y) * 0.005;
          next[i].vx *= 0.82;
          next[i].vy *= 0.82;
          next[i].x += next[i].vx;
          next[i].y += next[i].vy;
          // Bounds
          next[i].x = Math.max(20, Math.min(width - 20, next[i].x));
          next[i].y = Math.max(20, Math.min(height - 20, next[i].y));
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [width, height, positions.length]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="infectedGlow">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Edges */}
      {network.edges.map((e, i) => {
        const a = positions[e.a];
        const b = positions[e.b];
        if (!a || !b) return null;
        const aInf = network.nodes[e.a].infected;
        const bInf = network.nodes[e.b].infected;
        const both = aInf && bInf;
        const stroke = both
          ? "rgba(239,68,68,0.55)"
          : aInf || bInf
          ? "rgba(239,68,68,0.25)"
          : "rgba(148,163,184,0.18)";
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={stroke}
            strokeWidth={both ? 1.5 : 1}
          />
        );
      })}

      {/* Nodes */}
      {network.nodes.map(n => {
        const p = positions[n.id];
        if (!p) return null;
        const fill = n.infected
          ? "#ef4444"
          : n.protected
          ? "#06b6d4"
          : "#22c55e";
        return (
          <g key={n.id} style={{ transition: "opacity 0.4s" }}>
            {n.infected && (
              <circle cx={p.x} cy={p.y} r={18} fill="url(#infectedGlow)">
                <animate
                  attributeName="r"
                  values="14;22;14"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={n.protected ? 9 : 8}
              fill={fill}
              stroke={n.protected ? "#67e8f9" : "rgba(0,0,0,0.5)"}
              strokeWidth={n.protected ? 2 : 1}
              style={{
                filter: n.infected
                  ? "drop-shadow(0 0 6px #ef4444)"
                  : n.protected
                  ? "drop-shadow(0 0 4px #06b6d4)"
                  : "none",
                transition: "fill 0.6s ease",
              }}
            />
            <text
              x={p.x}
              y={p.y + 3}
              fontSize="9"
              textAnchor="middle"
              fill="#0d1117"
              fontWeight="bold"
              style={{ pointerEvents: "none" }}
            >
              {n.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
