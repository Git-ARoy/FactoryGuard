'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, Activity, Server, Database, HardDrive, Cpu, Radio } from 'lucide-react';
import { apiClient } from '@/lib/api-client/client';
import { HealthCheckResponse } from '@/lib/domain/types';

export function Header() {
  const [time, setTime] = useState<string>('');
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Initial health check
    apiClient.getHealth().then(setHealth).catch(() => null);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Plant Name */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors shadow-inner">
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 tracking-wider text-base uppercase font-mono">
                FactoryGuard
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/60 font-semibold">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">
              Industrial Monitoring &amp; Telemetry
            </p>
          </div>
        </Link>

        <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block" />

        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-status-pulse" />
          <span>PLANT: ALLIANCE PRECISION FACILITY 01</span>
        </div>
      </div>

      {/* Azure Service Cloud Status Badges */}
      <div className="hidden xl:flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
          <Server size={12} className="text-cyan-400" />
          <span>App Service</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
          <Cpu size={12} className="text-amber-400" />
          <span>Functions</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
          <Database size={12} className="text-emerald-400" />
          <span>Cosmos DB</span>
          <span className="text-[9px] text-slate-500">
            {health?.dependencies.cosmos === 'ok' ? 'Cloud' : 'Local'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
          <HardDrive size={12} className="text-sky-400" />
          <span>Blob Storage</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
          <Radio size={12} className="text-purple-400" />
          <span>App Insights</span>
        </div>
      </div>

      {/* Clock & Status */}
      <div className="flex items-center gap-4 font-mono">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-slate-200 font-semibold flex items-center justify-end gap-1.5">
            <Activity size={12} className="text-emerald-400" />
            <span>SYSTEM ACTIVE</span>
          </div>
          <span className="text-[10px] text-slate-500">{time || 'CONNECTING...'}</span>
        </div>
      </div>
    </header>
  );
}
