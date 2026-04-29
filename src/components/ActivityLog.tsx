import { LogEntry } from "../utils/log";

interface Props {
  entries: LogEntry[];
}

const SEVERITY_STYLE: Record<string, string> = {
  INFO: "text-cyan-300",
  WARNING: "text-amber-300",
  CRITICAL: "text-red-400",
};

const SEVERITY_BADGE: Record<string, string> = {
  INFO: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  WARNING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  CRITICAL: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function ActivityLog({ entries }: Props) {
  return (
    <div className="h-64 overflow-y-auto rounded-lg border border-white/5 bg-black/60 p-3 font-mono text-xs">
      {entries.length === 0 ? (
        <div className="flex h-full items-center justify-center text-slate-600">
          &gt; No events yet. Awaiting telemetry…
        </div>
      ) : (
        <ul className="space-y-1">
          {entries.map(e => (
            <li key={e.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-500">[{e.timestamp}]</span>
              <span
                className={
                  "rounded border px-1.5 text-[10px] font-bold " +
                  SEVERITY_BADGE[e.severity]
                }
              >
                {e.severity}
              </span>
              <span className={SEVERITY_STYLE[e.severity]}>{e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
