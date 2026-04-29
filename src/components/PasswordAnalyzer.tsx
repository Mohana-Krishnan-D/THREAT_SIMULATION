import { useState, useEffect, useRef } from "react";
import { analyzePassword, PasswordAnalysis } from "../utils/password";

interface Props {
  onChange: (a: PasswordAnalysis) => void;
}

const STRENGTH_COLORS: Record<string, string> = {
  Empty: "#374151",
  Weak: "#ef4444",
  Moderate: "#f59e0b",
  Strong: "#22c55e",
  "Very Strong": "#06b6d4",
};

export function PasswordAnalyzer({ onChange }: Props) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const analysis = analyzePassword(pw);
  const color = STRENGTH_COLORS[analysis.strength];

  // Notify parent on change
  const lastSent = useRef("");
  useEffect(() => {
    const sig = `${analysis.entropy}|${analysis.strength}`;
    if (sig !== lastSent.current) {
      lastSent.current = sig;
      onChange(analysis);
    }
  }, [analysis, onChange]);

  const checks = [
    { label: "a-z", ok: analysis.hasLower },
    { label: "A-Z", ok: analysis.hasUpper },
    { label: "0-9", ok: analysis.hasDigit },
    { label: "!@#", ok: analysis.hasSpecial },
  ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="Type a password to test…"
          className="w-full rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 pr-16 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-cyan-400"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-[#0d1117]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${analysis.scorePercent}%`,
            background: color,
            boxShadow: pw ? `0 0 10px ${color}` : "none",
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide" style={{ color }}>
          {analysis.strength}
        </span>
        <span className="text-slate-400">
          Entropy: <span className="font-mono text-slate-200">{analysis.entropy.toFixed(1)} bits</span>
        </span>
      </div>

      <div className="rounded-lg border border-white/5 bg-[#0d1117] p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Estimated crack time</span>
          <span className="font-mono font-semibold" style={{ color }}>
            {analysis.crackTime}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-slate-400">Charset size</span>
          <span className="font-mono text-slate-200">{analysis.charsetSize}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-slate-400">Length</span>
          <span className="font-mono text-slate-200">{analysis.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {checks.map(c => (
          <span
            key={c.label}
            className={
              "rounded-md border px-2 py-0.5 text-xs font-mono " +
              (c.ok
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                : "border-white/10 bg-white/5 text-slate-500")
            }
          >
            {c.ok ? "✓" : "○"} {c.label}
          </span>
        ))}
      </div>

      {analysis.penalties.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300">
          <div className="mb-1 font-semibold">Penalties applied:</div>
          <ul className="list-inside list-disc space-y-0.5">
            {analysis.penalties.map(p => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
