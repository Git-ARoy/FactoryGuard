'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  Database,
  HardDrive,
  Radio,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client/client';
import { HealthCheckResponse } from '@/lib/domain/types';
import { Card, Button, Skeleton } from '@/components/ui';

export default function SystemArchitecturePage() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getHealth();
      setHealth(res);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const services = [
    {
      name: 'Azure App Service',
      role: 'Web Application & Presentation Layer',
      icon: Server,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/40',
      description:
        'Hosts the Next.js web application, industrial operations dashboard, and presentation-tier API routes. Provides high-availability HTTPS serving.',
      techDetails: 'Linux Node.js 20 App Service Plan • App Router • Server-Side Rendering',
      status: 'Active (Online)',
      statusOk: true,
    },
    {
      name: 'Azure Functions',
      role: 'Serverless Event & Anomaly Processing',
      icon: Cpu,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      description:
        'Executes serverless telemetry ingestion, deterministic anomaly threshold evaluations, and incident state transitions without a dedicated server process.',
      techDetails: 'TypeScript Azure Functions v4 Model • HTTP Triggers • Stateless Serverless',
      status: 'Integrated / Local Ready',
      statusOk: true,
    },
    {
      name: 'Azure Cosmos DB for NoSQL',
      role: 'Managed Operational Data Store',
      icon: Database,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      description:
        'Provides low-latency NoSQL persistence for machinery metadata, continuous time-series telemetry events, and active/resolved incident records.',
      techDetails: 'Partitioning: machines (/id), telemetry (/machineId), incidents (/machineId)',
      status: health?.dependencies.cosmos === 'ok' ? 'Azure Cosmos Connected' : 'Local In-Memory Mode',
      statusOk: true,
    },
    {
      name: 'Azure Blob Storage',
      role: 'Binary Document & Archive Storage',
      icon: HardDrive,
      color: 'text-sky-400',
      borderColor: 'border-sky-500/40',
      description:
        'Stores machine operating manuals, preventive maintenance procedures, and quarterly inspection reports with signed SAS authorization.',
      techDetails: 'Blob Container: documents • Short-lived SAS URLs (Read-Only 15m)',
      status: health?.dependencies.storage === 'ok' ? 'Azure Blob Storage Connected' : 'Local Asset Mode',
      statusOk: true,
    },
    {
      name: 'Azure Application Insights',
      role: 'Enterprise Observability & Diagnostics',
      icon: Radio,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/40',
      description:
        'Captures structured telemetry events for every simulation trigger, HTTP latency, route exceptions, and telemetry ingestion durations for live auditing.',
      techDetails: 'OpenTelemetry / App Insights SDK • Structured JSON Telemetry Logging',
      status: 'Structured Logs Active',
      statusOk: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wider text-slate-100 uppercase">
              Cloud Architecture &amp; Service Health
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono font-semibold">
              5 Core Azure Services
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            System architectural topology &amp; readiness indicators designed for the Azure LaunchPad 2026 workshop
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={checkHealth}
          icon={RefreshCw}
        >
          Check System Readiness
        </Button>
      </div>

      {/* System Status Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-status-pulse" />
          <div>
            <span className="text-slate-200 font-bold">FactoryGuard System Status: OK</span>
            <span className="text-slate-400 block text-[11px] mt-0.5">
              Build Version: {health?.version || '1.0.0'} • Server Time: {health?.timestamp || new Date().toISOString()}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Dual-Mode: Zero-dependency local development supported with automatic Cosmos/Blob fallback.
        </div>
      </div>

      {/* 5 Core Azure Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => {
          const Icon = svc.icon;
          return (
            <Card
              key={svc.name}
              className={`border-t-4 ${svc.borderColor} flex flex-col justify-between`}
            >
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <Icon size={18} className={svc.color} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-semibold">
                    <CheckCircle2 size={10} />
                    <span>{svc.status}</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-sans">
                    {svc.name}
                  </h3>
                  <div className="text-[11px] text-cyan-400 font-semibold mt-0.5">
                    {svc.role}
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  {svc.description}
                </p>

                <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                  {svc.techDetails}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Architecture Diagram Walkthrough */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-cyan-400" />
            <span className="font-mono text-sm font-semibold">
              Data Flow &amp; Service Responsibility Mapping
            </span>
          </div>
        }
      >
        <div className="bg-slate-950 p-4 rounded border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
          <pre>{`
  [Operator Browser] 
          |
          | HTTPS Requests
          v
  +--------------------------------------------------------------------+
  |                        Azure App Service                           |
  |  Next.js 14 Web Dashboard • SSR Presentation • REST API Endpoints |
  +---------------------------------+----------------------------------+
                                    |
            Authenticated / Controlled Server API Call
                                    |
                                    v
  +--------------------------------------------------------------------+
  |                        Azure Functions                             |
  |  Telemetry Ingestion • Anomaly Rule Engine • Incident State Logic  |
  +-------------------+----------------------------+-------------------+
                      |                            |
                      v                            v
  +-------------------------------------+   +--------------------------+
  |        Azure Cosmos DB (NoSQL)       |   |    Azure Blob Storage    |
  |  • machines    (partition: /id)     |   |  • Technical manuals     |
  |  • telemetry   (partition: /machId) |   |  • Maintenance SOPs      |
  |  • incidents   (partition: /machId) |   |  • Inspection reports    |
  |  • documents   (partition: /machId) |   +--------------------------+
  +-------------------------------------+
                      ^
                      | Diagnostic Traces & Metric Logs
                      |
  +-------------------+------------------------------------------------+
  |                    Azure Application Insights                      |
  |  Structured Simulation Events • Latency • Failure Diagnostics     |
  +--------------------------------------------------------------------+
          `}</pre>
        </div>
      </Card>
    </div>
  );
}
