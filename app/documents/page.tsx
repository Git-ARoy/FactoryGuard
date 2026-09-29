'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  Search,
  HardDrive,
  Cpu,
  BookOpen,
  Wrench,
  ClipboardCheck,
  FileBarChart,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client/client';
import { DocumentMetadata, DocumentCategory } from '@/lib/domain/types';
import { Card, Button, Skeleton, ErrorBanner } from '@/components/ui';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | ''>('');
  const [machineFilter, setMachineFilter] = useState('');

  const fetchDocs = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.getDocuments({
        category: (categoryFilter as DocumentCategory) || undefined,
        machineId: machineFilter || undefined,
      });
      setDocuments(res.items);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, machineFilter]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleDownload = async (doc: DocumentMetadata) => {
    try {
      const res = await apiClient.getDocumentDownloadUrl(doc.id);
      if (res?.url) {
        window.open(res.url, '_blank');
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Download failed: ${error.message}`);
    }
  };

  const getCategoryIcon = (category: DocumentCategory) => {
    switch (category) {
      case 'MANUAL':
        return BookOpen;
      case 'MAINTENANCE':
        return Wrench;
      case 'INSPECTION':
        return ClipboardCheck;
      case 'REPORT':
        return FileBarChart;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wider text-slate-100 uppercase">
              Machine Documents &amp; Reports
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800 font-mono font-semibold">
              Azure Blob Storage
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Binary technical assets stored in Azure Blob Storage with short-lived signed SAS authorization
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchDocs}
          icon={RefreshCw}
        >
          Refresh Library
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as DocumentCategory | '')}
              className="bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Categories</option>
              <option value="MANUAL">Manuals</option>
              <option value="MAINTENANCE">Maintenance SOPs</option>
              <option value="INSPECTION">Inspection Records</option>
              <option value="REPORT">Engineering Reports</option>
            </select>
          </div>

          {/* Machine Filter */}
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Filter by Unit ID (e.g. CNC-02)"
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded pl-7 pr-3 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {(categoryFilter || machineFilter) && (
          <button
            onClick={() => {
              setCategoryFilter('');
              setMachineFilter('');
            }}
            className="text-cyan-400 hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={fetchDocs} />
      ) : documents.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 font-mono text-sm">
          No documents found matching the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const Icon = getCategoryIcon(doc.category);
            return (
              <Card
                key={doc.id}
                className="hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 font-mono">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100 font-sans">
                        {doc.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                          {doc.category}
                        </span>
                        {doc.machineId && (
                          <Link
                            href={`/machines/${doc.machineId}`}
                            className="text-cyan-400 hover:underline text-[11px] font-bold flex items-center gap-1"
                          >
                            <Cpu size={10} />
                            <span>{doc.machineId}</span>
                          </Link>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {(doc.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono font-medium border border-slate-700 transition-colors shrink-0"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
