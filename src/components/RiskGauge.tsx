import { RiskAssessment } from "../utils/risk";

interface Props {
  risk: RiskAssessment;
}

function levelColor(score: number) {
  // Interpolate green -> yellow -> red
  const clamped = Math.min(100, Math.max(0, score));
  let r: number, g: number, b: number;
  if (clamped < 50) {
    const t = clamped / 50;
    r = Math.round(34 + (250 - 34) * t);
    g = Math.round(197 + (204 - 197) * t);
    b = Math.round(94 + (21 - 94) * t);
  } else {
    const t = (clamped - 50) / 50;
    r = Math.round(250 + (239 - 250) * t);
    g = Math.round(204 + (68 - 204) * t);
    b = Math.round(21 + (68 - 21) * t);
  }
  return `rgb(${r},${g},${b})`;
}

export function RiskGauge({ risk }: Props) {
  const size = 180;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, risk.score));
  const dash = (pct / 100) * circ;
  const color = levelColor(risk.score);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1f2937"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{
              transition: "stroke-dasharray 0.6s ease, stroke 0.6s ease",
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold" style={{ color }}>
            {risk.score.toFixed(0)}
          </div>
          <div className="text-xs uppercase tracking-widest text-slate-400">
            Risk Score
          </div>
        </div>
      </div>
      <div
        className="mt-3 rounded-full px-4 py-1 text-sm font-semibold"
        style={{ background: `${color}22`, color }}
      >
        {risk.level}
      </div>
    </div>
  );
}
