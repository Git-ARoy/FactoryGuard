'use client';

import React, { useState } from 'react';
import { TelemetryEvent } from '@/lib/domain/types';
import { THRESHOLDS } from '@/lib/domain/thresholds';

interface TelemetryChartsProps {
  telemetry: TelemetryEvent[];
  machineId: string;
}

export function TelemetryCharts({ telemetry }: TelemetryChartsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'temperature' | 'vibration' | 'pressure'>('all');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Reverse so chronological order left to right
  const points = [...telemetry].reverse();

  if (points.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 font-mono text-sm">
        No telemetry records available for this unit.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Telemetry Stream ({points.length} samples)
          </span>
        </div>
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-800 text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Metrics
          </button>
          <button
            onClick={() => setActiveTab('temperature')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'temperature'
                ? 'bg-rose-950/80 text-rose-300 font-semibold border border-rose-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Temp (°C)
          </button>
          <button
            onClick={() => setActiveTab('vibration')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'vibration'
                ? 'bg-amber-950/80 text-amber-300 font-semibold border border-amber-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vibration (mm/s)
          </button>
          <button
            onClick={() => setActiveTab('pressure')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'pressure'
                ? 'bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pressure (PSI)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(activeTab === 'all' || activeTab === 'temperature') && (
          <SingleMetricChart
            title="Spindle & Core Temperature"
            unit="°C"
            data={points.map((p) => p.temperatureC)}
            timestamps={points.map((p) => p.timestamp)}
            strokeColor="#f43f5e"
            fillColor="rgba(244, 63, 94, 0.15)"
            normalBand={[THRESHOLDS.temperature.normalMin, THRESHOLDS.temperature.normalMax]}
            warningThreshold={THRESHOLDS.temperature.warningMax}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            minScale={30}
            maxScale={110}
          />
        )}

        {(activeTab === 'all' || activeTab === 'vibration') && (
          <SingleMetricChart
            title="Tri-Axial Bearing Vibration"
            unit="mm/s"
            data={points.map((p) => p.vibrationMmS)}
            timestamps={points.map((p) => p.timestamp)}
            strokeColor="#f59e0b"
            fillColor="rgba(245, 158, 11, 0.15)"
            normalBand={[THRESHOLDS.vibration.normalMin, THRESHOLDS.vibration.normalMax]}
            warningThreshold={THRESHOLDS.vibration.warningMax}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            minScale={0}
            maxScale={14}
          />
        )}

        {(activeTab === 'all' || activeTab === 'pressure') && (
          <SingleMetricChart
            title="Hydraulic & Coolant Line Pressure"
            unit="PSI"
            data={points.map((p) => p.pressurePsi)}
            timestamps={points.map((p) => p.timestamp)}
            strokeColor="#06b6d4"
            fillColor="rgba(6, 182, 212, 0.15)"
            normalBand={[THRESHOLDS.pressure.normalMin, THRESHOLDS.pressure.normalMax]}
            warningThreshold={THRESHOLDS.pressure.warningMax}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            minScale={80}
            maxScale={130}
          />
        )}
      </div>
    </div>
  );
}

interface SingleMetricChartProps {
  title: string;
  unit: string;
  data: number[];
  timestamps: string[];
  strokeColor: string;
  fillColor: string;
  normalBand: [number, number];
  warningThreshold: number;
  hoverIndex: number | null;
  onHover: (index: number | null) => void;
  minScale: number;
  maxScale: number;
}

function SingleMetricChart({
  title,
  unit,
  data,
  timestamps,
  strokeColor,
  fillColor,
  normalBand,
  warningThreshold,
  hoverIndex,
  onHover,
  minScale,
  maxScale,
}: SingleMetricChartProps) {
  const width = 800;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 25, left: 45 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const latestVal = data[data.length - 1];
  const hoveredVal = hoverIndex !== null ? data[hoverIndex] : latestVal;
  const hoveredTime =
    hoverIndex !== null ? timestamps[hoverIndex] : timestamps[timestamps.length - 1];

  const scaleY = (val: number) => {
    const clamped = Math.max(minScale, Math.min(maxScale, val));
    const ratio = (clamped - minScale) / (maxScale - minScale);
    return padding.top + plotHeight - ratio * plotHeight;
  };

  const scaleX = (idx: number) => {
    if (data.length <= 1) return padding.left;
    return padding.left + (idx / (data.length - 1)) * plotWidth;
  };

  // Build SVG path
  const pathD = data.reduce((acc, val, idx) => {
    const x = scaleX(idx);
    const y = scaleY(val);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${scaleX(data.length - 1)} ${scaleY(minScale)} L ${scaleX(0)} ${scaleY(minScale)} Z`;

  // Warning & Critical guideline heights
  const yNormalMax = scaleY(normalBand[1]);
  const yWarningMax = scaleY(warningThreshold);

  return (
    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <div>
          <span className="text-xs font-semibold text-slate-300">{title}</span>
          <span className="text-[10px] text-slate-500 font-mono ml-2">
            Normal: {normalBand[0]}-{normalBand[1]} {unit} | Warning: &gt;{normalBand[1]} | Critical: &gt;{warningThreshold}
          </span>
        </div>
        <div className="text-right font-mono">
          <span className="text-base font-bold text-slate-100">{hoveredVal?.toFixed(1)}</span>
          <span className="text-xs text-slate-400 ml-1">{unit}</span>
          {hoveredTime && (
            <span className="text-[10px] text-slate-500 block">
              {new Date(hoveredTime).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => onHover(null)}
        >
          {/* Background grid lines */}
          <line
            x1={padding.left}
            y1={scaleY(minScale)}
            x2={width - padding.right}
            y2={scaleY(minScale)}
            stroke="#1e293b"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={scaleY((minScale + maxScale) / 2)}
            x2={width - padding.right}
            y2={scaleY((minScale + maxScale) / 2)}
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Warning threshold line */}
          <line
            x1={padding.left}
            y1={yNormalMax}
            x2={width - padding.right}
            y2={yNormalMax}
            stroke="#f59e0b"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.6"
          />
          <text
            x={width - padding.right + 2}
            y={yNormalMax + 3}
            fill="#f59e0b"
            fontSize="9"
            fontFamily="monospace"
            opacity="0.8"
          >
            WARN
          </text>

          {/* Critical threshold line */}
          <line
            x1={padding.left}
            y1={yWarningMax}
            x2={width - padding.right}
            y2={yWarningMax}
            stroke="#f43f5e"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.7"
          />
          <text
            x={width - padding.right + 2}
            y={yWarningMax + 3}
            fill="#f43f5e"
            fontSize="9"
            fontFamily="monospace"
            opacity="0.9"
          >
            CRIT
          </text>

          {/* Y Axis ticks */}
          <text
            x={padding.left - 8}
            y={scaleY(maxScale) + 4}
            fill="#64748b"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            {maxScale}
          </text>
          <text
            x={padding.left - 8}
            y={scaleY(minScale)}
            fill="#64748b"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            {minScale}
          </text>

          {/* Area Fill */}
          <path d={areaD} fill={fillColor} />

          {/* Main Line */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points and Hover targets */}
          {data.map((val, idx) => {
            const cx = scaleX(idx);
            const cy = scaleY(val);
            const isHovered = hoverIndex === idx;

            return (
              <g key={idx}>
                {/* Visual circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 3}
                  fill={isHovered ? '#ffffff' : strokeColor}
                  stroke="#090d16"
                  strokeWidth="1.5"
                  className="transition-all"
                />

                {/* Invisible hover hitbox */}
                <rect
                  x={cx - (plotWidth / data.length) / 2}
                  y={padding.top}
                  width={plotWidth / data.length}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => onHover(idx)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
