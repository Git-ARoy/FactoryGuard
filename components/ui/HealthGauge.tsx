import React from 'react';

interface HealthGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function HealthGauge({
  score,
  size = 'md',
  showLabel = true,
  className = '',
}: HealthGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  let color = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
  let barColor = 'bg-emerald-500';
  if (clampedScore < 50) {
    color = 'text-rose-400 border-rose-500/30 bg-rose-950/20';
    barColor = 'bg-rose-500';
  } else if (clampedScore < 80) {
    color = 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    barColor = 'bg-amber-500';
  }

  if (size === 'sm') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
        <span className={`font-mono text-xs font-semibold ${color.split(' ')[0]}`}>
          {clampedScore}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-2.5 py-1 rounded-md border ${color} ${className}`}
    >
      {showLabel && (
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
          Health
        </span>
      )}
      <span className="font-mono font-bold text-sm leading-none">
        {clampedScore}
        <span className="text-[10px] text-slate-400 font-normal">/100</span>
      </span>
      <div className="w-16 bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  );
}
