'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RotateCcw,
  Loader2,
  Terminal,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Radio,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client/client';
import {
  SimulationScenario,
  SimulationEventResult,
  SimulationResetResult,
  Machine,
} from '@/lib/domain/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HealthGauge } from '@/components/ui/HealthGauge';
import { Card, Button } from '@/components/ui';

interface SimulationHistoryLog {
  id: string;
  timestamp: string;
  machineId: string;
  scenario: SimulationScenario;
  resultStatus: string;
  healthScore: number;
  durationMs: number;
  incidentCreatedOrUpdated: boolean;
  incidentSeverity?: string;
  rawResponse: unknown;
}

export default function SimulationStudioPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [targetMachineId, setTargetMachineId] = useState('CNC-02');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [history, setHistory] = useState<SimulationHistoryLog[]>([]);
  const [activeLog, setActiveLog] = useState<SimulationHistoryLog | null>(null);

  useEffect(() => {
    apiClient.getMachines({ limit: 50 }).then((res) => {
      setMachines(res.items);
      const initial = res.items.find((m) => m.id === 'CNC-02') || res.items[0];
      if (initial) {
        setSelectedMachine(initial);
        setTargetMachineId(initial.id);
      }
    });
  }, []);

  const handleMachineChange = (id: string) => {
    setTargetMachineId(id);
    const m = machines.find((item) => item.id === id) || null;
    setSelectedMachine(m);
  };

  const executeScenario = async (scenario: SimulationScenario) => {
    setLoading(true);
    setActiveStep(1); // Simulation requested
    const start = Date.now();

    try {
      setTimeout(() => setActiveStep(2), 150); // Ingestion & Anomaly Engine
      setTimeout(() => setActiveStep(3), 350); // Cosmos DB Persistence
      setTimeout(() => setActiveStep(4), 500); // Complete

      let resultStatus = 'NORMAL';
      let healthScore = 96;
      let incidentSeverity: string | undefined = undefined;
      let incidentCreatedOrUpdated = false;
      let rawRes: unknown = null;

      if (scenario === 'RECOVERY') {
        const res = await apiClient.resetSimulation(targetMachineId);
        rawRes = res;
        resultStatus = 'NORMAL';
        healthScore = 96;
      } else {
        const res = await apiClient.triggerSimulation(targetMachineId, scenario);
        rawRes = res;
        resultStatus = res.machine.status;
        healthScore = res.machine.healthScore;
        if (res.incident) {
          incidentCreatedOrUpdated = true;
          incidentSeverity = res.incident.severity;
        }
      }

      const durationMs = Date.now() - start;

      const logItem: SimulationHistoryLog = {
        id: `sim-${Date.now()}`,
        timestamp: new Date().toISOString(),
        machineId: targetMachineId,
        scenario,
        resultStatus,
        healthScore,
        durationMs,
        incidentCreatedOrUpdated,
        incidentSeverity,
        rawResponse: rawRes,
      };

      setHistory((prev) => [logItem, ...prev]);
      setActiveLog(logItem);

      // Refresh machine state in UI
      const updated = await apiClient.getMachineDetail(targetMachineId);
      if (updated) {
        setSelectedMachine(updated.machine);
      }

      window.dispatchEvent(new CustomEvent('factoryguard:refresh'));
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Simulation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wider text-slate-100 uppercase">
              Workshop Simulation Studio
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800 font-mono font-semibold">
              Deterministic Demo Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Directly exercises Ingestion API &rarr; Anomaly Engine &rarr; Cosmos DB Persistence &rarr; App Insights Observability
          </p>
        </div>

        {/* Target Machine Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-xs">
          <span className="text-slate-400">Target Machine:</span>
          <select
            value={targetMachineId}
            onChange={(e) => handleMachineChange(e.target.value)}
            disabled={loading}
            className="bg-slate-950 border border-slate-700 rounded px-3 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-bold"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} {m.id === 'CNC-02' ? '(Primary Demo Unit)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Machine Quick Overview Card */}
      {selectedMachine && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold">
              <Cpu size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-100">
                  {selectedMachine.id}
                </span>
                <span className="text-slate-300 font-sans">{selectedMachine.name}</span>
                <StatusBadge status={selectedMachine.status} size="sm" />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {selectedMachine.line} • {selectedMachine.location}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <HealthGauge score={selectedMachine.healthScore} size="md" />
            <Link href={`/machines/${selectedMachine.id}`}>
              <Button variant="secondary" size="sm">
                Open Unit Detail
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* End-to-End Cloud Flow Visualizer */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-cyan-400" />
            <span className="font-mono text-xs uppercase tracking-wider">
              End-to-End Cloud Workflow Trace
            </span>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
          {/* Step 1 */}
          <div
            className={`p-3 rounded border transition-all ${
              activeStep >= 1
                ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              Step 1: Simulation
            </div>
            <div className="font-semibold text-slate-200">REST API Ingest</div>
            <div className="text-[10px] text-slate-400 mt-1">
              POST /api/simulations/events
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`p-3 rounded border transition-all ${
              activeStep >= 2
                ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              Step 2: Processing
            </div>
            <div className="font-semibold text-slate-200">Anomaly Engine</div>
            <div className="text-[10px] text-slate-400 mt-1">
              Deterministic threshold eval
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={`p-3 rounded border transition-all ${
              activeStep >= 3
                ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              Step 3: Cosmos DB
            </div>
            <div className="font-semibold text-slate-200">State Persistence</div>
            <div className="text-[10px] text-slate-400 mt-1">
              Machine, Telemetry, Incidents
            </div>
          </div>

          {/* Step 4 */}
          <div
            className={`p-3 rounded border transition-all ${
              activeStep >= 4
                ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              Step 4: Observability
            </div>
            <div className="font-semibold text-slate-200">App Insights Trace</div>
            <div className="text-[10px] text-slate-400 mt-1">
              Structured event logged
            </div>
          </div>
        </div>
      </Card>

      {/* Scenario Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Scenario 1: NORMAL */}
        <Card className="border-t-4 border-t-emerald-500 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">
                SCENARIO 1
              </span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 font-sans">
              Normal Operation
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Injects normal baseline telemetry: Temp 58.4°C, Vibration 2.3 mm/s, Pressure 102.5 PSI.
            </p>
            <div className="text-[11px] font-mono text-emerald-300 pt-1">
              Result: Unit stays NORMAL (Health: ~94-98).
            </div>
          </div>
          <div className="pt-4">
            <Button
              variant="success"
              className="w-full"
              size="sm"
              disabled={loading}
              onClick={() => executeScenario('NORMAL')}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Trigger Normal
            </Button>
          </div>
        </Card>

        {/* Scenario 2: WARNING */}
        <Card className="border-t-4 border-t-amber-500 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">
                SCENARIO 2
              </span>
              <AlertTriangle size={16} className="text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 font-sans">
              Warning Condition
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Elevates vibration to 7.4 mm/s (&gt;6.0 mm/s) and temp to 78.5°C (&gt;70°C).
            </p>
            <div className="text-[11px] font-mono text-amber-300 pt-1">
              Result: Unit transitions to WARNING, creates WARNING incident.
            </div>
          </div>
          <div className="pt-4">
            <Button
              variant="warning"
              className="w-full"
              size="sm"
              disabled={loading}
              onClick={() => executeScenario('WARNING')}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Simulate Warning
            </Button>
          </div>
        </Card>

        {/* Scenario 3: CRITICAL */}
        <Card className="border-t-4 border-t-rose-500 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-rose-400">
                SCENARIO 3
              </span>
              <AlertOctagon size={16} className="text-rose-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 font-sans">
              Critical Emergency
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Spikes temp to 96.2°C (&gt;90°C), vibration to 11.6 mm/s (&gt;10 mm/s), pressure to 119.5 PSI.
            </p>
            <div className="text-[11px] font-mono text-rose-300 pt-1">
              Result: Unit transitions to CRITICAL, creates CRITICAL alert.
            </div>
          </div>
          <div className="pt-4">
            <Button
              variant="danger"
              className="w-full"
              size="sm"
              disabled={loading}
              onClick={() => executeScenario('CRITICAL')}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Simulate Critical
            </Button>
          </div>
        </Card>

        {/* Scenario 4: RECOVERY */}
        <Card className="border-t-4 border-t-cyan-500 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">
                SCENARIO 4
              </span>
              <RotateCcw size={16} className="text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 font-sans">
              Reset &amp; Recovery
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Recovers unit back to normal baseline and marks active incidents as RESOLVED.
            </p>
            <div className="text-[11px] font-mono text-cyan-300 pt-1">
              Result: Machine returns to NORMAL (Health: 96).
            </div>
          </div>
          <div className="pt-4">
            <Button
              variant="secondary"
              className="w-full"
              size="sm"
              disabled={loading}
              onClick={() => executeScenario('RECOVERY')}
              icon={RotateCcw}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Recover / Reset Unit
            </Button>
          </div>
        </Card>
      </div>

      {/* Live Event Execution Log & Payload Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* History Table */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-amber-400" />
              <span className="font-mono">Live Simulation Execution History</span>
            </div>
          }
        >
          {history.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              No simulations triggered yet during this session. Click any scenario button above to begin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Scenario</th>
                    <th className="pb-2">Result</th>
                    <th className="pb-2">Latency</th>
                    <th className="pb-2 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((h) => (
                    <tr
                      key={h.id}
                      className={`hover:bg-slate-800/40 cursor-pointer ${
                        activeLog?.id === h.id ? 'bg-slate-800/60' : ''
                      }`}
                      onClick={() => setActiveLog(h)}
                    >
                      <td className="py-2 text-slate-400">
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 font-bold text-slate-200">{h.machineId}</td>
                      <td className="py-2">
                        <span className="text-slate-300 font-bold">{h.scenario}</span>
                      </td>
                      <td className="py-2">
                        <StatusBadge status={h.resultStatus} size="sm" />
                      </td>
                      <td className="py-2 text-slate-400">{h.durationMs}ms</td>
                      <td className="py-2 text-right text-cyan-400">View</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* JSON Payload Inspector */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-cyan-400" />
              <span className="font-mono">API Response Inspector</span>
            </div>
          }
        >
          {activeLog ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                <span>Ref: {activeLog.id}</span>
                <span>Latency: {activeLog.durationMs}ms</span>
              </div>
              <pre className="bg-slate-950 p-4 rounded border border-slate-800 overflow-x-auto text-[11px] text-cyan-300 leading-relaxed max-h-72">
                {JSON.stringify(activeLog.rawResponse, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 font-mono text-xs">
              Select a simulation record on the left to inspect its raw JSON API response.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
