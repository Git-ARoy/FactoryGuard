'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Cpu,
  Clock,
  Wrench,
  Thermometer,
  Activity,
  Gauge,
  FileText,
  AlertTriangle,
  Play,
  RotateCcw,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client/client';
import {
  MachineDetailResponse,
  TelemetryEvent,
  SimulationScenario,
} from '@/lib/domain/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HealthGauge } from '@/components/ui/HealthGauge';
import { Card, Button, Skeleton, ErrorBanner } from '@/components/ui';
import { TelemetryCharts } from '@/components/telemetry/TelemetryCharts';

export default function MachineDetailPage() {
  const params = useParams();
  const machineId = params.machineId as string;

  const [detail, setDetail] = useState<MachineDetailResponse | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchMachineData = useCallback(async () => {
    if (!machineId) return;
    try {
      setError(null);
      const [detailData, telData] = await Promise.all([
        apiClient.getMachineDetail(machineId),
        apiClient.getMachineTelemetry(machineId, 25),
      ]);
      setDetail(detailData);
      setTelemetry(telData.items);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  useEffect(() => {
    fetchMachineData();

    const handleRefresh = () => fetchMachineData();
    window.addEventListener('factoryguard:refresh', handleRefresh);
    const interval = setInterval(fetchMachineData, 8000);

    return () => {
      window.removeEventListener('factoryguard:refresh', handleRefresh);
      clearInterval(interval);
    };
  }, [fetchMachineData]);

  const handleSimulate = async (scenario: SimulationScenario) => {
    setSimulating(true);
    setActionMessage(null);
    try {
      if (scenario === 'RECOVERY') {
        const res = await apiClient.resetSimulation(machineId);
        setActionMessage(
          `Unit recovered to NORMAL state. ${res.resolvedIncidentIds.length} incident(s) resolved.`
        );
      } else {
        const res = await apiClient.triggerSimulation(machineId, scenario);
        setActionMessage(
          `Triggered ${scenario}: Status is now ${res.machine.status} (Health: ${res.machine.healthScore}/100)`
        );
      }
      await fetchMachineData();
      window.dispatchEvent(new CustomEvent('factoryguard:refresh'));
    } catch (err: unknown) {
      const error = err as Error;
      setActionMessage(`Error: ${error.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleDownload = async (docId: string, name: string) => {
    try {
      const info = await apiClient.getDocumentDownloadUrl(docId);
      if (info?.url) {
        window.open(info.url, '_blank');
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Download failed: ${error.message}`);
    }
  };

  if (loading && !detail) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/machines"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:underline"
        >
          <ArrowLeft size={14} /> Back to Machinery Fleet
        </Link>
        <ErrorBanner
          message={error || `Machine ${machineId} not found.`}
          onRetry={fetchMachineData}
        />
      </div>
    );
  }

  const { machine, latestTelemetry, activeIncidents, documents } = detail;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/machines"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Machinery Fleet
        </Link>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchMachineData}
          icon={RefreshCw}
        >
          Refresh Data
        </Button>
      </div>

      {/* Machine Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-mono font-bold">
              <Cpu size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold font-mono text-slate-100">
                  {machine.id}
                </h1>
                <StatusBadge status={machine.status} size="md" />
                {machine.id === 'CNC-02' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                    PRIMARY DEMO TARGET
                  </span>
                )}
              </div>
              <p className="text-sm font-sans text-slate-300 font-medium">
                {machine.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
            <span>Type: <strong className="text-slate-200">{machine.machineType}</strong></span>
            <span>•</span>
            <span>Line: <strong className="text-slate-200">{machine.line}</strong></span>
            <span>•</span>
            <span>Location: <strong className="text-slate-200">{machine.location}</strong></span>
          </div>
        </div>

        {/* Health Score & Stats */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-6 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Health Score
            </span>
            <HealthGauge score={machine.healthScore} size="lg" />
          </div>

          <div className="space-y-1 font-mono text-xs">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
              Operating Total
            </span>
            <div className="flex items-center gap-1.5 text-slate-200 font-bold">
              <Clock size={14} className="text-slate-400" />
              <span>{machine.operatingHours || 0} Hours</span>
            </div>
          </div>

          <div className="space-y-1 font-mono text-xs">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
              Maintenance Due
            </span>
            <div className="flex items-center gap-1.5 text-slate-200 font-bold">
              <Wrench size={14} className="text-slate-400" />
              <span>
                {machine.maintenanceDueAt
                  ? new Date(machine.maintenanceDueAt).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Machine Simulator Controls */}
      <Card
        className="border-cyan-500/40 bg-slate-950/90"
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Play size={16} className="text-cyan-400" />
              <span className="font-mono text-sm font-semibold">
                Telemetry Simulation Controls for {machine.id}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Exercises live ingestion &amp; anomaly detection pipeline
            </span>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="success"
            size="sm"
            onClick={() => handleSimulate('NORMAL')}
            disabled={simulating}
          >
            {simulating ? <Loader2 size={14} className="animate-spin" /> : null}
            Generate Normal Reading
          </Button>

          <Button
            variant="warning"
            size="sm"
            onClick={() => handleSimulate('WARNING')}
            disabled={simulating}
          >
            {simulating ? <Loader2 size={14} className="animate-spin" /> : null}
            Simulate Warning Event
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => handleSimulate('CRITICAL')}
            disabled={simulating}
          >
            {simulating ? <Loader2 size={14} className="animate-spin" /> : null}
            Simulate Critical Event
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSimulate('RECOVERY')}
            disabled={simulating}
            icon={RotateCcw}
          >
            Reset to Normal
          </Button>
        </div>

        {actionMessage && (
          <div className="mt-3 p-2.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 flex items-center justify-between">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-500 hover:text-slate-300 ml-2"
            >
              ×
            </button>
          </div>
        )}
      </Card>

      {/* Latest Telemetry Sensor Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Temperature */}
        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs font-mono uppercase">
            <span>Spindle Temperature</span>
            <Thermometer size={16} className="text-rose-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-slate-100">
            {latestTelemetry?.temperatureC !== undefined
              ? `${latestTelemetry.temperatureC}°C`
              : '—'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Baseline band: 45 - 70°C
          </span>
        </Card>

        {/* Vibration */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs font-mono uppercase">
            <span>Tri-Axial Vibration</span>
            <Activity size={16} className="text-amber-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-slate-100">
            {latestTelemetry?.vibrationMmS !== undefined
              ? `${latestTelemetry.vibrationMmS} mm/s`
              : '—'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Baseline band: 0 - 6.0 mm/s
          </span>
        </Card>

        {/* Pressure */}
        <Card className="border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs font-mono uppercase">
            <span>Coolant Pressure</span>
            <Gauge size={16} className="text-cyan-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-slate-100">
            {latestTelemetry?.pressurePsi !== undefined
              ? `${latestTelemetry.pressurePsi} PSI`
              : '—'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Baseline band: 90 - 110 PSI
          </span>
        </Card>
      </div>

      {/* Time-Series Charts (Temperature, Vibration, Pressure) */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-cyan-400" />
            <span className="font-mono">Real-time Telemetry Historical Trend</span>
          </div>
        }
      >
        <TelemetryCharts telemetry={telemetry} machineId={machine.id} />
      </Card>

      {/* Bottom Grid: Active Incidents & Documentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Incidents */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="font-mono">Machine Incidents &amp; Alerts ({activeIncidents.length})</span>
            </div>
          }
        >
          {activeIncidents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              No active incidents on {machine.id}. Operating normally.
            </div>
          ) : (
            <div className="space-y-3 font-mono">
              {activeIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3.5 rounded bg-slate-950/80 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge status={inc.severity} size="sm" />
                    <span className="text-[10px] text-slate-500">
                      Detected: {new Date(inc.detectedAt).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 font-sans">
                      {inc.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {inc.description}
                    </p>
                  </div>

                  {inc.telemetrySnapshot && (
                    <div className="pt-2 border-t border-slate-900 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                      <div>
                        <span className="text-slate-500 block">TEMP SNAPSHOT</span>
                        <span className="text-slate-200 font-bold">
                          {inc.telemetrySnapshot.temperatureC}°C
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">VIB SNAPSHOT</span>
                        <span className="text-slate-200 font-bold">
                          {inc.telemetrySnapshot.vibrationMmS} mm/s
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">PRESS SNAPSHOT</span>
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

        {/* Machine Documentation (Blob Storage) */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-sky-400" />
              <span className="font-mono">Azure Blob Storage Documents ({documents.length})</span>
            </div>
          }
        >
          {documents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              No technical documents uploaded for this machine.
            </div>
          ) : (
            <div className="space-y-3 font-mono">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200 font-sans">
                        {doc.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Category: {doc.category} • {(doc.sizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(doc.id, doc.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono font-medium transition-colors border border-slate-700 shrink-0"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
