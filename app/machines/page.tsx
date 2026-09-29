'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Factory,
  Search,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Clock,
  Wrench,
  Cpu,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client/client';
import { Machine, MachineStatus } from '@/lib/domain/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HealthGauge } from '@/components/ui/HealthGauge';
import { Card, Button, Skeleton, ErrorBanner } from '@/components/ui';

export default function MachinesFleetPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MachineStatus | ''>('');
  const [lineFilter, setLineFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const fetchMachines = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.getMachines({
        search: search || undefined,
        status: (statusFilter as MachineStatus) || undefined,
        line: lineFilter || undefined,
        limit: 100,
      });
      setMachines(res.items);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, lineFilter]);

  useEffect(() => {
    fetchMachines();
    const handleRefresh = () => fetchMachines();
    window.addEventListener('factoryguard:refresh', handleRefresh);
    return () => window.removeEventListener('factoryguard:refresh', handleRefresh);
  }, [fetchMachines]);

  // Extract unique lines for filter dropdown
  const lines = [
    'Precision Line A',
    'Robotic Assembly Line B',
    'Heavy Stamping Line C',
    'Fluid Handling Line D',
    'Material Logistics',
  ];

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wider text-slate-100 uppercase">
              Machinery Registry &amp; Fleet
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {machines.length} Units Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Facility machine registry with persisted Cosmos DB state &amp; continuous health derivation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchMachines}
            icon={RefreshCw}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Search by ID, name, bay..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded pl-9 pr-3 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MachineStatus | '')}
              className="bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Statuses</option>
              <option value="NORMAL">Normal Only</option>
              <option value="WARNING">Warning Only</option>
              <option value="CRITICAL">Critical Only</option>
            </select>
          </div>

          {/* Line Filter */}
          <div className="flex items-center gap-2">
            <Factory size={14} className="text-slate-500" />
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Production Lines</option>
              {lines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(search || statusFilter || lineFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setLineFilter('');
            }}
            className="text-xs text-cyan-400 hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Machine List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={fetchMachines} />
      ) : machines.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 font-mono text-sm">
          No machinery matching the current filter parameters.
        </div>
      ) : viewMode === 'table' ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Unit Identifier</th>
                  <th className="py-3 px-4 font-semibold">Machine Name &amp; Classification</th>
                  <th className="py-3 px-4 font-semibold">Line &amp; Facility Location</th>
                  <th className="py-3 px-4 font-semibold">Health Score</th>
                  <th className="py-3 px-4 font-semibold">Operating State</th>
                  <th className="py-3 px-4 font-semibold">Operating Hours</th>
                  <th className="py-3 px-4 font-semibold">Maintenance Due</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {machines.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      <Link
                        href={`/machines/${m.id}`}
                        className="hover:text-cyan-400 flex items-center gap-2"
                      >
                        {m.id === 'CNC-02' ? (
                          <span
                            className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px]"
                            title="Primary Workshop Demo Unit"
                          >
                            DEMO
                          </span>
                        ) : null}
                        <span>{m.id}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-sans font-medium text-sm">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {m.machineType}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{m.line}</div>
                      <div className="text-[10px] text-slate-500">{m.location}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <HealthGauge score={m.healthScore} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-500" />
                        <span>{m.operatingHours || '—'} hrs</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Wrench size={12} className="text-slate-500" />
                        <span>
                          {m.maintenanceDueAt
                            ? new Date(m.maintenanceDueAt).toLocaleDateString()
                            : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/machines/${m.id}`}>
                        <button className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors border border-slate-700">
                          Inspect &rarr;
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((m) => (
            <Card
              key={m.id}
              className="hover:border-slate-700 transition-all space-y-3"
              title={
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-cyan-400" />
                    <span className="font-mono font-bold text-slate-100">{m.id}</span>
                    {m.id === 'CNC-02' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                        DEMO
                      </span>
                    )}
                  </div>
                  <StatusBadge status={m.status} size="sm" />
                </div>
              }
            >
              <div className="space-y-3">
                <div>
                  <h4 className="font-sans font-semibold text-slate-200 text-sm">
                    {m.name}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {m.line} • {m.location}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <HealthGauge score={m.healthScore} size="md" />
                  <div className="text-right text-[11px] font-mono text-slate-400">
                    <span className="block text-slate-500 text-[10px]">OPERATING</span>
                    <span>{m.operatingHours || 0} hrs</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Last Seen: {new Date(m.lastTelemetryAt).toLocaleTimeString()}
                  </span>
                  <Link href={`/machines/${m.id}`}>
                    <Button variant="secondary" size="sm">
                      Inspect
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
