'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  AlertTriangle,
  AlertOctagon,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client/client';
import { SimulationScenario } from '@/lib/domain/types';

export function QuickSimulationBar() {
  const router = useRouter();
  const [targetMachine, setTargetMachine] = useState('CNC-02');
  const [loading, setLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const runScenario = async (scenario: SimulationScenario) => {
    setLoading(true);
    setLastMessage(null);
    try {
      if (scenario === 'RECOVERY') {
        const res = await apiClient.resetSimulation(targetMachine);
        setLastMessage(
          `Unit ${targetMachine} recovered to NORMAL. ${res.resolvedIncidentIds.length} incident(s) resolved.`
        );
      } else {
        const res = await apiClient.triggerSimulation(targetMachine, scenario);
        const incidentText = res.incident
          ? ` [Incident: ${res.incident.severity}]`
          : '';
        setLastMessage(
          `Triggered ${scenario} on ${targetMachine} -> State: ${res.machine.status} (Score: ${res.machine.healthScore})${incidentText}`
        );
      }

      // Notify other components & revalidate page data
      window.dispatchEvent(new CustomEvent('factoryguard:refresh'));
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error;
      setLastMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold uppercase tracking-wider">
          <Radio size={14} className="text-amber-400 animate-pulse" />
          <span>Workshop Demo Control</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Target:</span>
          <select
            value={targetMachine}
            onChange={(e) => setTargetMachine(e.target.value)}
            disabled={loading}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="CNC-02">CNC-02 (Demo Primary)</option>
            <option value="CNC-01">CNC-01</option>
            <option value="ROBOT-01">ROBOT-01</option>
            <option value="ROBOT-03">ROBOT-03</option>
            <option value="PRESS-03">PRESS-03</option>
            <option value="PUMP-03">PUMP-03</option>
            <option value="CONV-03">CONV-03</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => runScenario('NORMAL')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          <span>Normal</span>
        </button>

        <button
          onClick={() => runScenario('WARNING')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-800/80 text-amber-300 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
          <span>Warning</span>
        </button>

        <button
          onClick={() => runScenario('CRITICAL')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <AlertOctagon size={12} />}
          <span>Critical</span>
        </button>

        <button
          onClick={() => runScenario('RECOVERY')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
          <span>Reset / Recovery</span>
        </button>
      </div>

      {lastMessage && (
        <div className="w-full text-[11px] text-cyan-400 bg-slate-950 px-3 py-1 rounded border border-slate-800 flex items-center justify-between">
          <span className="truncate">{lastMessage}</span>
          <button
            onClick={() => setLastMessage(null)}
            className="text-slate-500 hover:text-slate-300 ml-2"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
