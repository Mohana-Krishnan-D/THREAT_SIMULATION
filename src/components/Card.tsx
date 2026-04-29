import React from "react";
import { cn } from "../utils/cn";

interface CardProps {
  title?: string;
  icon?: string;
  accent?: string; // tailwind color class for accent border/glow
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}

export function Card({ title, icon, accent = "shadow-cyan-500/10", children, className, right }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-[#161b22] p-4 md:p-5 shadow-lg",
        "transition hover:border-white/10",
        accent,
        className
      )}
    >
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-200">
            {icon && <span className="text-base">{icon}</span>}
            {title}
          </h2>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
