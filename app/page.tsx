'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Factory,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client/client';
import { DashboardSummaryResponse, Machine } from '@/lib/domain/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HealthGauge } from '@/components/ui/HealthGauge';
import { Card, Button, Skeleton, ErrorBanner } from '@/components/ui';

export default function DashboardOverviewPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [sumData, machData] = await Promise.all([
        apiClient.getDashboardSummary(),
        apiClient.getMachines({ limit: 6 }),
      ]);
      setSummary(sumData);
      setMachines(machData.items);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Listen to quick simulation triggers
    const handleRefresh = () => fetchData();
    window.addEventListener('factoryguard:refresh', handleRefresh);

    // Auto-polling interval for live telemetry simulation
    const interval = setInterval(fetchData, 10000);

    return () => {
      window.removeEventListener('factoryguard:refresh', handleRefresh);
      clearInterval(interval);
    };
  }, [fetchData]);

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error && !summary) {
    return <ErrorBanner message={error} onRetry={fetchData} />;
  }

  const plant = summary?.plant;
  const recentIncidents = summary?.recentIncidents || [];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wider text-slate-100 uppercase">
              Plant Operational Overview
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono font-semibold">
              LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Alliance Precision Manufacturing Facility 01 • Real-time Telemetry & Anomaly Processing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Link href="/simulation">
            <Button variant="primary" size="sm" icon={TrendingUp}>
              Simulation Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Machines */}
        <Card className="border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono text-xs uppercase">
            <span>Total Fleet</span>
            <Factory size={16} className="text-cyan-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {plant?.machineCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Across 4 production lines
          </span>
        </Card>

        {/* Normal Machines */}
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono text-xs uppercase">
            <span>Normal</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-400">
            {plant?.normalCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Operating within tolerances
          </span>
        </Card>

        {/* Warning Machines */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono text-xs uppercase">
            <span>Warning</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-400">
            {plant?.warningCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Telemetry band elevated
          </span>
        </Card>

        {/* Critical Machines */}
        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono text-xs uppercase">
            <span>Critical</span>
            <AlertOctagon size={16} className="text-rose-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-rose-400">
            {plant?.criticalCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Immediate attention required
          </span>
        </Card>

        {/* Active Incidents */}
        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono text-xs uppercase">
            <span>Active Incidents</span>
            <AlertTriangle size={16} className="text-purple-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-purple-400">
            {plant?.activeIncidentCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Open anomaly alerts
          </span>
        </Card>

        {/* Overall Health Index */}
        <Card className="border-l-4 border-l-cyan-400">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono text-xs uppercase">
            <span>Plant Health</span>
            <ShieldCheck size={16} className="text-cyan-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-cyan-300">
            {plant?.healthScore || 100}
            <span className="text-xs text-slate-500 ml-1">/100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                (plant?.healthScore || 100) >= 80
                  ? 'bg-emerald-500'
                  : (plant?.healthScore || 100) >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${plant?.healthScore || 100}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Main Content Layout: Machinery Status & Incident Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machinery Fleet Status (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title={
              <div className="flex items-center gap-2">
                <Factory size={16} className="text-cyan-400" />
                <span>Operational Machinery Status</span>
              </div>
            }
            action={
              <Link
                href="/machines"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group"
              >
                <span>View Full Registry</span>
                <ArrowRight
                  size={12}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-2.5 font-medium">Unit ID</th>
                    <th className="pb-2.5 font-medium">Name &amp; Type</th>
                    <th className="pb-2.5 font-medium">Line / Location</th>
                    <th className="pb-2.5 font-medium">Health</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {machines.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 font-bold text-slate-200">
                        <Link
                          href={`/machines/${m.id}`}
                          className="hover:text-cyan-400 flex items-center gap-1.5"
                        >
                          {m.id === 'CNC-02' && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"
                              title="Primary Workshop Demo Unit"
                            />
                          )}
                          <span>{m.id}</span>
                        </Link>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-200 font-sans font-medium">
                          {m.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {m.machineType}
                        </div>
                      </td>
                      <td className="py-3 text-slate-400">
                        <div>{m.line}</div>
                        <div className="text-[10px] text-slate-500">{m.location}</div>
                      </td>
                      <td className="py-3">
                        <HealthGauge score={m.healthScore} size="sm" />
                      </td>
                      <td className="py-3">
                        <StatusBadge status={m.status} size="sm" />
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/machines/${m.id}`}>
                          <button className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors">
                            Inspect
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Workshop Spotlight: CNC-02 Demo Unit Card */}
          <Card
            className="border-cyan-500/30 bg-slate-900/90"
            title={
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-cyan-400" />
                <span className="font-mono">Workshop Primary Target: CNC-02</span>
              </div>
            }
            action={
              <Link href="/machines/CNC-02">
                <Button variant="secondary" size="sm">
                  Full Diagnostics
                </Button>
              </Link>
            }
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
              <div className="space-y-1">
                <div className="text-slate-200 font-sans font-medium text-sm">
                  Vertical Milling CNC Unit 02
                </div>
                <p className="text-slate-400 text-xs">
                  Equipped with real-time vibration transducer, spindle RTD temperature sensor, and through-tool coolant pressure monitor.
                </p>
                <div className="text-[11px] text-cyan-400 pt-1">
                  Use the persistent toolbar above or the Simulation Studio to trigger live cloud telemetry events on this unit.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/machines/CNC-02">
                  <Button variant="primary" size="sm" icon={ArrowRight}>
                    Open Telemetry Stream
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Active Incidents Stream (1 col) */}
        <div className="space-y-4">
          <Card
            title={
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <span>Active Incident Stream</span>
              </div>
            }
            action={
              <Link
                href="/incidents"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
              >
                All Incidents
              </Link>
            }
          >
            {recentIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No active incidents. All plant machinery operating within normal bounds.
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                {recentIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={inc.severity} size="sm" />
                      <span className="text-[10px] text-slate-500">
                        {new Date(inc.detectedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-200 font-sans">
                        {inc.title}
                      </div>
                      <div className="text-[11px] text-cyan-400 mt-0.5">
                        Target: <Link href={`/machines/${inc.machineId}`} className="hover:underline font-bold">{inc.machineId}</Link>
                      </div>
                    </div>

                    {inc.telemetrySnapshot && (
                      <div className="pt-2 border-t border-slate-900 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                        <div>
                          <span className="text-slate-500 block">TEMP</span>
                          <span className="text-slate-200 font-bold">
                            {inc.telemetrySnapshot.temperatureC}°C
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">VIB</span>
                          <span className="text-slate-200 font-bold">
                            {inc.telemetrySnapshot.vibrationMmS} mm/s
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">PRESS</span>
                          <span className="text-slate-200 font-bold">
                            {inc.telemetrySnapshot.pressurePsi} PSI
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
