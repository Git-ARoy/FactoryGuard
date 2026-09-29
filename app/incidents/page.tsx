'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client/client';
import { Incident, IncidentSeverity, IncidentStatus } from '@/lib/domain/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, Button, Skeleton, ErrorBanner } from '@/components/ui';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | ''>('');
  const [machineIdFilter, setMachineIdFilter] = useState('');

  const fetchIncidents = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.getIncidents({
        status: (statusFilter as IncidentStatus) || undefined,
        severity: (severityFilter as IncidentSeverity) || undefined,
        machineId: machineIdFilter || undefined,
        limit: 50,
      });
      setIncidents(res.items);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, machineIdFilter]);

  useEffect(() => {
    fetchIncidents();
    const handleRefresh = () => fetchIncidents();
    window.addEventListener('factoryguard:refresh', handleRefresh);
    return () => window.removeEventListener('factoryguard:refresh', handleRefresh);
  }, [fetchIncidents]);

  const openCount = incidents.filter((i) => i.status === 'OPEN').length;
  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL' && i.status === 'OPEN').length;
  const warningCount = incidents.filter((i) => i.severity === 'WARNING' && i.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wider text-slate-100 uppercase">
              Incident &amp; Alert Center
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-950/80 text-purple-400 border border-purple-800 font-mono font-semibold">
              Cosmos DB Persisted
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Autonomous threshold-driven incident logs with deduplication &amp; snapshot audit trails
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchIncidents}
          icon={RefreshCw}
        >
          Refresh Incidents
        </Button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <Card className="border-l-4 border-l-purple-500 py-3">
          <div className="text-slate-400 text-xs uppercase">Open Incident Count</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{openCount}</div>
        </Card>
        <Card className="border-l-4 border-l-rose-500 py-3">
          <div className="text-slate-400 text-xs uppercase">Active Critical Alerts</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{criticalCount}</div>
        </Card>
        <Card className="border-l-4 border-l-amber-500 py-3">
          <div className="text-slate-400 text-xs uppercase">Active Warning Alerts</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{warningCount}</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | '')}
              className="bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Statuses (Open &amp; Resolved)</option>
              <option value="OPEN">Open Only</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | '')}
              className="bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning Only</option>
            </select>
          </div>

          {/* Machine Filter Input */}
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Filter by Unit ID (e.g. CNC-02)"
              value={machineIdFilter}
              onChange={(e) => setMachineIdFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded pl-7 pr-3 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {(statusFilter || severityFilter || machineIdFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setSeverityFilter('');
              setMachineIdFilter('');
            }}
            className="text-cyan-400 hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Incident List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={fetchIncidents} />
      ) : incidents.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 font-mono text-sm">
          No incidents found matching current filter parameters.
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <Card
              key={inc.id}
              className={`border-l-4 ${
                inc.status === 'RESOLVED'
                  ? 'border-l-slate-600 bg-slate-900/60 opacity-80'
                  : inc.severity === 'CRITICAL'
                  ? 'border-l-rose-500'
                  : 'border-l-amber-500'
              }`}
            >
              <div className="space-y-3 font-mono">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={inc.status === 'RESOLVED' ? 'RESOLVED' : inc.severity}
                      size="sm"
                    />
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                      {inc.type}
                    </span>
                    <span className="text-xs text-slate-500">#{inc.id}</span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Detected: {new Date(inc.detectedAt).toLocaleString()}
                    {inc.resolvedAt && (
                      <span className="text-emerald-400 ml-2">
                        • Resolved: {new Date(inc.resolvedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100 font-sans">
                      {inc.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                      {inc.description}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Link href={`/machines/${inc.machineId}`}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs border border-slate-700 transition-colors">
                        <Cpu size={12} />
                        <span>Inspect {inc.machineId}</span>
                        <ExternalLink size={12} />
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Telemetry Snapshot at Incident Trigger */}
                {inc.telemetrySnapshot && (
                  <div className="bg-slate-950/90 rounded border border-slate-800/80 p-3 mt-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                      Trigger Telemetry Snapshot (Ref: {inc.triggerTelemetryId})
                    </span>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">TEMPERATURE</span>
                        <span className="text-slate-100 font-bold">
                          {inc.telemetrySnapshot.temperatureC}°C
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">VIBRATION</span>
                        <span className="text-slate-100 font-bold">
                          {inc.telemetrySnapshot.vibrationMmS} mm/s
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">PRESSURE</span>
                        <span className="text-slate-100 font-bold">
                          {inc.telemetrySnapshot.pressurePsi} PSI
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
